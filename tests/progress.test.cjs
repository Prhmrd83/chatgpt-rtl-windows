'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const project=path.resolve(__dirname,'..');
const psLiteral=s=>"'"+s.replaceAll("'","''")+"'";
function powershell(t,body,{timeout=20000}={}) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rtl installer with spaces '));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const file=path.join(temp,'check.ps1');
  fs.writeFileSync(file,"\ufeff$ErrorActionPreference='Stop'\n[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)\n. "+psLiteral(path.join(project,'scripts/progress.ps1'))+'\n'+body(temp));
  return spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',file],{encoding:'utf8',timeout,windowsHide:true});
}
function worker(temp,code) { const file=path.join(temp,'child with spaces.cjs');fs.writeFileSync(file,code);return psLiteral(file); }
const node=psLiteral(process.execPath);

test('setup.cmd forwards the explicit retry switch from a folder with spaces',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rtl setup retry with spaces '));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  fs.mkdirSync(path.join(temp,'scripts'));
  fs.copyFileSync(path.join(project,'setup.cmd'),path.join(temp,'setup.cmd'));
  fs.writeFileSync(path.join(temp,'scripts/setup.ps1'),"[CmdletBinding()]param([switch]$Retry)\nif(-not $Retry){exit 9}\nWrite-Host RETRY_FORWARDED\nexit 0\n");
  const r=spawnSync('cmd.exe',['/d','/s','/c','setup.cmd -Retry <nul'],{cwd:temp,encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/RETRY_FORWARDED/);
});

for(const answer of ['y','YES','n',''])test('blocked manual install prompts once; answer '+JSON.stringify(answer),t=>{
  const r=powershell(t,()=>`. ${psLiteral(path.join(project,'scripts/install-retry.ps1'))}
$script:attempts=0;$script:prompts=0
$install={param([bool]$retry) $script:attempts++; if(-not $retry){$e=New-Object System.InvalidOperationException('BLOCKED');$e.Data['code']='CANDIDATE_BLOCKED';throw $e};return @{active='verified-retry'}}
$prompt={$script:prompts++;return ${psLiteral(answer)}}
try{$result=Invoke-RtlInstallWithRetry -Install $install -Prompt $prompt;Write-Host ('ACTIVE='+$result.active)}catch{Write-Host ('FAILED='+$_.Exception.Message)}
Write-Host ('ATTEMPTS='+$script:attempts);Write-Host ('PROMPTS='+$script:prompts)`);
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/PROMPTS=1/);
  if(/^y(es)?$/i.test(answer)){assert.match(r.stdout,/ACTIVE=verified-retry/);assert.match(r.stdout,/ATTEMPTS=2/);}
  else{assert.match(r.stdout,/FAILED=BLOCKED/);assert.match(r.stdout,/ATTEMPTS=1/);assert.doesNotMatch(r.stdout,/ACTIVE=/);}
});

for(const mode of ['automatic','explicit-retry','unrelated-error','retry-failure'])test('install retry preserves failure semantics: '+mode,t=>{
  const r=powershell(t,()=>`. ${psLiteral(path.join(project,'scripts/install-retry.ps1'))}
$script:attempts=0;$script:prompts=0
$install={param([bool]$retry) $script:attempts++;$e=New-Object System.InvalidOperationException('FAILED');${mode==='unrelated-error'?'':"$e.Data['code']='CANDIDATE_BLOCKED';"}throw $e}
try{Invoke-RtlInstallWithRetry -Install $install ${mode==='automatic'?'-Automatic':mode==='explicit-retry'?'-Retry':''} -Prompt {$script:prompts++;return 'y'} | Out-Null;throw 'Unexpected success'}catch{Write-Host ('ERROR='+$_.Exception.Message)}
Write-Host ('ATTEMPTS='+$script:attempts);Write-Host ('PROMPTS='+$script:prompts)`);
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/ERROR=FAILED/);
  assert.match(r.stdout,new RegExp('ATTEMPTS='+(mode==='retry-failure'?2:1)));
  assert.match(r.stdout,new RegExp('PROMPTS='+(mode==='retry-failure'?1:0)));
  assert.doesNotMatch(r.stdout,/Setup complete/);
});

for(const answer of ['y','n'])test('real install wrapper propagates blocked events and restores integration only after success: '+answer,t=>{
  const r=powershell(t,()=>`. ${psLiteral(path.join(project,'scripts/install-retry.ps1'))}
$script:project=${psLiteral(project)};$script:node='fixture-node';$script:cli='fixture-cli';$script:Root='fixture root with spaces';$script:Automatic=$false;$script:Options=@()
$script:attempts=0;$script:configured=0;$script:prompts=0
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile(${psLiteral(path.join(project,'chatgpt-rtl.ps1'))},[ref]$tokens,[ref]$errors)
foreach($name in @('Invoke-Core','Run-Action')){$fn=$ast.Find({param($a) $a -is [Management.Automation.Language.FunctionDefinitionAst] -and $a.Name -eq $name},$true);Invoke-Expression $fn.Extent.Text}
function Say([string]$Text,[object]$Color){Write-Host $Text}
function Source-App{return @{Path='source with spaces';Version='fixture-version'}}
function Configure-Integration{$script:configured++}
function Read-Host([string]$Prompt){$script:prompts++;return ${psLiteral(answer)}}
function Invoke-RtlProcess {
 param($FilePath,$ArgumentList,$WorkingDirectory,$Stage,[switch]$Events)
 $script:attempts++
 if($ArgumentList -notcontains '--source' -or $ArgumentList -notcontains 'source with spaces'){throw 'Missing source'}
 if($ArgumentList -notcontains '--retry'){return @{ExitCode=1;Events=@(@{type='error';code='CANDIDATE_BLOCKED';message='BLOCKED'});Result=$null}}
 return @{ExitCode=0;Events=@();Result=@{active='verified'}}
}
try{Run-Action 'install'}catch{Write-Host ('ERROR='+$_.Exception.Message)}
Write-Host ('ATTEMPTS='+$script:attempts);Write-Host ('CONFIGURED='+$script:configured);Write-Host ('PROMPTS='+$script:prompts)`);
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/PROMPTS=1/);
  if(answer==='y'){assert.match(r.stdout,/ATTEMPTS=2/);assert.match(r.stdout,/CONFIGURED=1/);assert.match(r.stdout,/Setup complete!/);}
  else{assert.match(r.stdout,/ATTEMPTS=1/);assert.match(r.stdout,/CONFIGURED=0/);assert.doesNotMatch(r.stdout,/Setup complete!/);}
});
test('silent slow download keeps showing elapsed progress until child completes',t=>{
  const r=powershell(t,temp=>{
    const file=worker(temp,'setTimeout(()=>console.log("DOWNLOAD_FINISHED"),4500)');
    return `$r=Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${file}) -Stage 'Downloading dependencies'\nif($r.ExitCode -ne 0){exit 1}`;
  });
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/Downloading dependencies \| 00:00/);
  assert.match(r.stdout,/Downloading dependencies \| 00:02/);
  assert.match(r.stdout,/Downloading dependencies \| 00:04/);
  assert.match(r.stdout,/DOWNLOAD_FINISHED/);
  assert.doesNotMatch(r.stdout,/%/);
});
test('network-like failure drains stderr and preserves nonzero child exit',t=>{
  const r=powershell(t,temp=>{
    const file=worker(temp,'setTimeout(()=>{console.error("npm ERR! ECONNRESET connection lost");process.exitCode=7},2200)');
    return `$r=Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${file}) -Stage 'Downloading dependencies'\nWrite-Host ('CHILD_EXIT='+$r.ExitCode)\nexit $r.ExitCode`;
  });
  assert.equal(r.status,7,r.stderr);
  assert.match(r.stdout,/ECONNRESET connection lost/);
  assert.match(r.stdout,/CHILD_EXIT=7/);
  assert.doesNotMatch(r.stdout,/Setup complete/);
});
test('phase events reach parent while work is running and result is parsed',t=>{
  const r=powershell(t,temp=>{
    const file=worker(temp,'console.log(JSON.stringify({type:"progress",message:"Verifying pristine backup"}));setTimeout(()=>{console.log(JSON.stringify({type:"progress",message:"Checking isolated startup"}));setTimeout(()=>console.log(JSON.stringify({type:"result",result:{active:"verified-test"}})),1100)},1100)');
    return `$r=Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${file}) -Events\nif($r.Result.active -ne 'verified-test'){throw 'Missing result'}\nWrite-Host RESULT_OK`;
  });
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/Verifying pristine backup/);
  assert.match(r.stdout,/Checking isolated startup/);
  assert.match(r.stdout,/RESULT_OK/);
});

test('batched stage events remain visible even when the child has already finished',t=>{
  const r=powershell(t,temp=>{
    const file=worker(temp,'for(const message of ["Verifying pristine backup","Checking isolated startup"]){console.log(JSON.stringify({type:"progress",message}));}console.log(JSON.stringify({type:"result",result:{active:"batched"}}))');
    return `$r=Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${file}) -Events\nif($r.Result.active -ne 'batched'){throw 'Missing result'}`;
  });
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/Verifying pristine backup/);assert.match(r.stdout,/Checking isolated startup/);
  assert.ok(r.stdout.indexOf('Verifying pristine backup')<r.stdout.indexOf('Checking isolated startup'));
});
test('quiet automatic runner emits no progress or captured child logs',t=>{
  const r=powershell(t,temp=>{
    const file=worker(temp,'console.log("hidden log");console.error("hidden stderr");console.log(JSON.stringify({type:"result",result:{active:"quiet"}}))');
    return `$r=Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${file}) -Quiet\nif($r.ExitCode -ne 0 -or $r.Lines.Count -ne 3){throw 'Failed to capture quiet child'}`;
  });
  assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'');
});
test('command arguments preserve spaces, quotes, trailing slashes and RTL text',t=>{
  const values=['','a b','ends with slash \\','a"quoted"word','فارسی עברית العربية'];
  const r=powershell(t,temp=>{
    const file=worker(temp,'console.log(JSON.stringify(process.argv.slice(2)))');
    return `$r=Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${[file,...values.map(psLiteral)].join(',')}) -Quiet\nWrite-Output $r.Lines[0]`;
  });
  assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),values);
});
test('invalid event stops only the owned process tree',t=>{
  // Use a separate live process to check tree ownership.
  const other=require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},20000)'],{windowsHide:true,stdio:'ignore'});
  t.after(()=>other.kill());
  const r=powershell(t,temp=>{
    const pidFile=path.join(temp,'child.pid');
    const file=worker(temp,`require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));console.log('invalid event');setTimeout(()=>{},30000)`);
    return `try{Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${file}) -Events | Out-Null;throw 'Expected failure'}catch{Write-Host STOPPED}\n$childId=[int](Get-Content -LiteralPath ${psLiteral(pidFile)})\nif(Get-Process -Id $childId -ErrorAction SilentlyContinue){throw 'Owned child leaked'}`;
  });
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/STOPPED/);
  assert.equal(other.exitCode,null);
});
test('successful exit without final event is rejected',t=>{
  const r=powershell(t,temp=>{
    const file=worker(temp,'console.log(JSON.stringify({type:"progress",message:"Preparing"}))');
    return `Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${file}) -Events | Out-Null`;
  });
  assert.notEqual(r.status,0);assert.match(r.stderr,/without a result event/);
});
test('JSON interface remains plain JSON; events has result/error envelopes',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rtl-cli-events-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const invoke=args=>spawnSync(process.execPath,[path.join(project,'cli.cjs'),...args,'--root',path.join(temp,'missing')],{encoding:'utf8',windowsHide:true});
  const json=invoke(['status','--json']);assert.equal(json.status,0,json.stderr);assert.equal(JSON.parse(json.stdout).active,null);
  const events=invoke(['status','--events']);assert.equal(events.status,0,events.stderr);assert.equal(JSON.parse(events.stdout).type,'result');
  const error=invoke(['invalid','--events']);assert.equal(error.status,1);assert.equal(JSON.parse(error.stdout).type,'error');
  const exclusive=invoke(['status','--json','--events']);assert.equal(exclusive.status,1);assert.equal(exclusive.stdout,'');
});
test('shortcut creation and repeat install persist the stable custom icon',t=>{
  const r=powershell(t,temp=>{
    const desktop=path.join(temp,'fake desktop'),menu=path.join(temp,'fake Start menu');
    fs.mkdirSync(desktop);fs.mkdirSync(menu);
    return `. ${psLiteral(path.join(project,'scripts/integration.ps1'))}\n$dirs=@(${psLiteral(desktop)},${psLiteral(menu)})\nNew-RtlShortcuts -InstalledTools ${psLiteral(project)} -Directories $dirs\n$shell=New-Object -ComObject WScript.Shell\n$old=$shell.CreateShortcut((Join-Path $dirs[0] 'ChatGPT RTL.lnk'));$old.IconLocation='powershell.exe,0';$old.Save()\nNew-RtlShortcuts -InstalledTools ${psLiteral(project)} -Directories $dirs\nforeach($dir in $dirs){$saved=$shell.CreateShortcut((Join-Path $dir 'ChatGPT RTL.lnk'));if($saved.IconLocation -ne ${psLiteral(path.join(project,'assets/chatgpt-rtl.ico')+',0')}){throw 'Wrong icon'};if($saved.Arguments -notmatch ' launch$'){throw 'Wrong launcher'}}\ntry{New-RtlShortcuts -InstalledTools ${psLiteral(temp)} -Directories $dirs;throw 'Expected missing icon failure'}catch{if($_.Exception.Message -notmatch 'missing'){throw}}\nWrite-Host SHORTCUTS_VERIFIED`;
  });
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/SHORTCUTS_VERIFIED/);
});
test('real npm download from a delayed disconnecting endpoint shows progress and fails clearly',async t=>{
  const http=require('node:http');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rtl npm slow network '));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  let requested=false;
  const server=http.createServer((request,response)=>{
    requested=true;
    setTimeout(()=>response.destroy(),3200);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.address().port}/slow-tool.tgz`;
  const pkg={name:'installer-network-fixture',version:'1.0.0',dependencies:{'slow-tool':'1.0.0'}};
  fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify(pkg));
  fs.writeFileSync(path.join(temp,'package-lock.json'),JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,requires:true,packages:{'':pkg,'node_modules/slow-tool':{version:'1.0.0',resolved:url}}}));
  const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  assert.ok(fs.existsSync(npmCli),'npm bundled with Node.js is required for this test');
  const script=path.join(temp,'network test.ps1');
  const args=[npmCli,'--prefix',temp,'ci','--ignore-scripts','--no-audit','--no-fund','--fetch-retries=0','--fetch-timeout=8000','--cache',path.join(temp,'cache')];
  fs.writeFileSync(script,"\ufeff$ErrorActionPreference='Stop'\n. "+psLiteral(path.join(project,'scripts/progress.ps1'))+`\n$r=Invoke-RtlProcess -FilePath ${node} -ArgumentList @(${args.map(psLiteral).join(',')}) -Stage 'Downloading dependencies'\nexit $r.ExitCode`);
  const r=await new Promise((resolve,reject)=>{
    const child=require('node:child_process').spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true});
    let stdout='',stderr='';
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.on('error',reject);child.on('close',status=>resolve({status,stdout,stderr}));
  });
  assert.ok(requested,'npm must attempt the controlled download');
  assert.notEqual(r.status,0,r.stderr);assert.match(r.stdout,/Downloading dependencies \| 00:02/);
  assert.match(r.stdout,/ECONNRESET|socket hang up|network/i);
  assert.doesNotMatch(r.stdout,/Setup complete/);
});
