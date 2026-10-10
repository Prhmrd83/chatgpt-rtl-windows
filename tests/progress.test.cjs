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
