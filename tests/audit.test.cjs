'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const M=require('../lib/manager.cjs');
const project=path.resolve(__dirname,'..');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
function temp(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rtl audit with spaces '));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  return dir;
}
function powershell(t,body) {
  const dir=temp(t),file=path.join(dir,'check.ps1');
  fs.writeFileSync(file,"\ufeff$ErrorActionPreference='Stop'\n"+body(dir));
  return spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',file],{encoding:'utf8',windowsHide:true,timeout:20000});
}
const loadFunctions=names=>`$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile(${quote(path.join(project,'chatgpt-rtl.ps1'))},[ref]$tokens,[ref]$errors)
foreach($name in @(${names.map(quote).join(',')})){$fn=$ast.Find({param($a) $a -is [Management.Automation.Language.FunctionDefinitionAst] -and $a.Name -eq $name},$true);Invoke-Expression $fn.Extent.Text}`;

test('installation rejects overlapping source and managed roots before writing',async t=>{
  const base=temp(t),source=path.join(base,'source');
  fs.mkdirSync(path.join(source,'resources'),{recursive:true});
  fs.writeFileSync(path.join(source,'ChatGPT.exe'),'fixture');
  fs.writeFileSync(path.join(source,'resources/app.asar'),'fixture');
  const payload=path.join(base,'payload.js');fs.writeFileSync(payload,'fixture');
  const root=path.join(source,'managed');
  await assert.rejects(M.install({source,root,payload}),/overlap/i);
  assert.equal(fs.existsSync(root),false);
  await assert.rejects(M.install({source,root:source,payload}),/overlap/i);
});

test('deployment ignores unrelated junctions and preserves the selected controller files',t=>{
  const base=temp(t),source=path.join(base,'source'),root=path.join(base,'managed');
  fs.mkdirSync(source);
  for(const name of ['lib','scripts','assets','node_modules'])fs.mkdirSync(path.join(source,name));
  for(const name of ['cli.cjs','payload.js','chatgpt-rtl.cmd','chatgpt-rtl.ps1','package.json','package-lock.json','LICENSE','NOTICE.md'])fs.writeFileSync(path.join(source,name),'fixture '+name);
  fs.symlinkSync(path.join(source,'assets'),path.join(source,'unrelated-link'),'junction');
  const r=spawnSync(process.execPath,[path.join(project,'scripts/deploy.cjs'),source,root],{encoding:'utf8',windowsHide:true});
  assert.equal(r.status,0,r.stderr);
  assert.equal(fs.readFileSync(path.join(root,'controller','payload.js'),'utf8'),'fixture payload.js');
  assert.equal(fs.existsSync(path.join(root,'controller','unrelated-link')),false);
});

test('custom-root shortcuts keep the root when opened or refreshed',t=>{
  const r=powershell(t,dir=>{
    const desktop=path.join(dir,'desktop');fs.mkdirSync(desktop);
    return `. ${quote(path.join(project,'scripts/integration.ps1'))}
$root=${quote(path.join(dir,'custom managed'))}
New-RtlShortcuts -InstalledTools ${quote(project)} -Root $root -Directories @(${quote(desktop)})
$shell=New-Object -ComObject WScript.Shell
$saved=$shell.CreateShortcut(${quote(path.join(desktop,'ChatGPT RTL.lnk'))})
if(-not $saved.Arguments.Contains('-Root "'+$root+'"')){throw 'Custom root lost in shortcut'}
Write-Host ROOT_PRESERVED`;
  });
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/ROOT_PRESERVED/);
});

test('scheduled update action retains the custom root without registering a real task',t=>{
  const r=powershell(t,()=>`${loadFunctions(['Configure-Integration'])}
$script:Root='C:\custom root';$script:project=Join-Path $Root 'controller';$script:Automatic=$true;$script:taskName='fixture'
function Say($Text,$Color){}
function New-RtlShortcuts {param($InstalledTools,$Directories,$Root)}
function New-ScheduledTaskAction {param($Execute,$Argument) if(-not $Argument.Contains('-Root "'+$script:Root+'"')){throw 'Custom root lost in task'};Write-Host TASK_ROOT_OK;return @{}}
function New-ScheduledTaskTrigger {param([switch]$AtLogOn,$User,[switch]$Daily,$At) return @{}}
function New-ScheduledTaskPrincipal {param($UserId,$LogonType,$RunLevel) return @{}}
function New-ScheduledTaskSettingsSet {param([switch]$StartWhenAvailable,$MultipleInstances,$ExecutionTimeLimit) return @{}}
function Register-ScheduledTask {param($TaskName,$Action,$Trigger,$Principal,$Settings,[switch]$Force) Write-Host REGISTERED_FIXTURE}
Configure-Integration`);
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/TASK_ROOT_OK/);assert.match(r.stdout,/REGISTERED_FIXTURE/);
});

test('installed controller defaults to its own managed root',t=>{
  const base=temp(t),root=path.join(base,'custom managed'),controller=path.join(root,'controller');
  fs.mkdirSync(controller,{recursive:true});
  fs.writeFileSync(path.join(root,'.chatgpt-rtl-owned'),'chatgpt-rtl/v1\n');
  fs.copyFileSync(path.join(project,'chatgpt-rtl.ps1'),path.join(controller,'chatgpt-rtl.ps1'));
  fs.cpSync(path.join(project,'scripts'),path.join(controller,'scripts'),{recursive:true});
  fs.writeFileSync(path.join(controller,'cli.cjs'),'console.log(JSON.stringify({active:process.argv[process.argv.indexOf("--root")+1],backups:[]}))');
  const r=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(controller,'chatgpt-rtl.ps1'),'status','-NoColor'],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.includes('Active version: '+root),r.stdout);
});
