'use strict';
const fs=require('node:fs');
const path=require('node:path');
const S=require('./lib/store.cjs');
const M=require('./lib/manager.cjs');
const {smoke}=require('./lib/smoke.cjs');
const {spawnSync}=require('node:child_process');

function parse(args) {
  const result={command:args.shift()||'status'};
  for(let i=0;i<args.length;i++) {
    const key=args[i];
    if(!key.startsWith('--')) {if(result.command==='backup'&&key==='list')continue;throw Error('Unexpected argument: '+key);}
    const name=key.slice(2);
    if(['json','events','retry','automatic','original','no-color'].includes(name))result[name]=true;
    else if(['root','source','source-version','id','payload'].includes(name)&&args[i+1]&&!args[i+1].startsWith('--'))result[name]=args[++i];
    else throw Error('Unknown or incomplete option: '+key);
  }
  result.root=result.root||path.join(process.env.LOCALAPPDATA||process.cwd(),'Programs','ChatGPT-RTL');
  if(result.json&&result.events)throw Error('Use either --json or --events, not both');
  return result;
}
function ensureClosed(root) {
  if(process.platform!=='win32')return;
  const helper=path.join(__dirname,'scripts/owned-processes.ps1');
  const r=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',helper,'-Root',root],{encoding:'utf8',windowsHide:true,timeout:15000});
  if(r.status!==0)throw Error('Could not determine whether the managed app is running');
  if(r.stdout.trim()!=='0')throw Error('ChatGPT RTL is running. Close it first; automatic updates will retry later.');
}
function critical(record,app) {
  const names=['resources/app.asar',record.exe];
  return Promise.all(names.map(async name=>{
    const expected=record.files.find(x=>x.path===name);
    if(!expected||await S.fileHash(path.join(app,name))!==expected.sha256)throw Error('Critical application integrity failed: '+name);
  }));
}
async function run(args) {
  const o=parse([...args]),root=path.resolve(o.root);
  let result;
  const progress=message=>{if(!o.automatic){if(o.events)console.log(JSON.stringify({type:'progress',message}));else if(!o.json)console.log('  > '+message);}};
  if(['install','update'].includes(o.command)) {
    ensureClosed(root);
    if(!o.source)throw Error('Run through chatgpt-rtl.cmd, or supply --source with the original app directory');
    const payload=o.payload||path.join(__dirname,'payload.js');
    const state=fs.existsSync(root)?S.state(root):null;
    if(o.automatic && state?.active && o['source-version']) {
      const active=S.readJSON(path.join(S.version(root,state.active),'record.json'));
      if(active.sourceVersion===o['source-version']&&active.payloadHash===S.hash(fs.readFileSync(payload)))return {unchanged:true,active:state.active};
    }
    result=await M.install({root,source:o.source,sourceVersion:o['source-version'],payload,retry:o.retry,progress});
  } else if(o.command==='status')result={...S.state(root),backups:M.backups(root)};
  else if(o.command==='doctor') {result=await M.doctor(root);if(result.issues?.length)process.exitCode=1;}
  else if(o.command==='backup')result=M.backups(root);
  else if(o.command==='rollback') {ensureClosed(root);result=o.original?await M.original(root):await M.rollback(root,o.id);}
  else if(o.command==='uninstall') {ensureClosed(root);result=await M.original(root);result.backupsRetained=true;}
  else if(o.command==='launch-path') {
    const state=S.state(root);if(!state.active)return {original:true};
    const dir=S.version(root,state.active),record=S.readJSON(path.join(dir,'record.json'));
    await critical(record,path.join(dir,'app'));
    const profile=S.inside(root,'profile');fs.mkdirSync(profile,{recursive:true});
    result={exe:path.join(dir,'app',record.exe),directory:path.join(dir,'app'),profile};
  } else if(o.command==='verify-launch') {
    ensureClosed(root);const state=S.state(root);if(!state.active)throw Error('No active managed app');
    await M.verifyVersion(root,state.active);
    result=await smoke(path.join(S.version(root,state.active),'app'),root,'verify-'+Date.now().toString(36));
  } else throw Error('Unknown command: '+o.command);
  if(o.automatic)M.log(root,'automatic-result',result);
  return result;
}
if(require.main===module)run(process.argv.slice(2)).then(result=>{
  const o=parse(process.argv.slice(2));
  console.log(o.events?JSON.stringify({type:'result',result}):JSON.stringify(result,null,2));
}).catch(error=>{
  try{const o=parse(process.argv.slice(2));if(o.automatic&&fs.existsSync(o.root))M.log(o.root,'automatic-error',{reason:error.message});}catch{}
  if(process.argv.includes('--events')&&!process.argv.includes('--json'))console.log(JSON.stringify({type:'error',message:error.message}));
  else console.error('ERROR: '+error.message);
  process.exitCode=1;
});
module.exports={parse,run};
