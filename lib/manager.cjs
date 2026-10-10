'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const S=require('./store.cjs');
const {patch}=require('./archive.cjs');
const {smoke}=require('./smoke.cjs');

const stamp=()=>Date.now().toString(36)+'-'+crypto.randomBytes(4).toString('hex');
function log(root,event,detail={}) {
  fs.appendFileSync(S.inside(root,'logs/events.jsonl'),JSON.stringify({time:new Date().toISOString(),event,...detail})+'\n');
}
function available(root,bytes) {
  const stat=fs.statfsSync(root);
  if(stat.bavail*stat.bsize<bytes)throw Error('Insufficient disk space; free space before retrying');
}
async function install(options) {
  const root=S.init(options.root);
  return S.withLock(root,async()=>{
    const source=path.resolve(options.source),current=S.state(root);
    if(source===root||source.startsWith(root+path.sep))throw Error('Source must be outside managed installation');
    const exe=['ChatGPT.exe','Codex.exe'].find(n=>fs.existsSync(path.join(source,n)));
    if(!exe||!fs.existsSync(path.join(source,'resources/app.asar')))throw Error('Original ChatGPT app not found');
    options.progress?.('Checking source files');
    const sourceManifest=await S.tree(source),fingerprint=S.hash(JSON.stringify(sourceManifest));
    const payload=fs.readFileSync(options.payload,'utf8'),payloadHash=S.hash(payload);
    const candidateKey=S.hash(fingerprint+payloadHash);
    if(current.blocked===candidateKey&&!options.retry)throw Error('This candidate is blocked after a failure/rollback; use update --retry after investigating');
    if(current.active) {
      const active=S.readJSON(path.join(S.version(root,current.active),'record.json'));
      if(active.candidateKey===candidateKey) {await verifyVersion(root,current.active);return {unchanged:true,active:current.active};}
      await verifyVersion(root,current.active);
    }
    const bytes=sourceManifest.reduce((n,f)=>n+f.size,0);
    // Pristine backup + candidate + repack output + operational headroom.
    available(root,bytes*3+512*1024*1024);
    const id=stamp(),journal=S.inside(root,'transactions/'+id+'.json');
    const record={schema:1,id,source,sourceVersion:options.sourceVersion||null,sourceFingerprint:fingerprint,payloadHash,candidateKey,created:new Date().toISOString(),exe};
    S.atomicJSON(journal,{...record,phase:'preparing',previous:current.active});
    const backupRelative='backups/original-'+fingerprint.slice(0,20);
    const backup=S.inside(root,backupRelative);
    const candidate=S.version(root,id),app=path.join(candidate,'app');
    try {
      options.progress?.('Verifying pristine backup');
      if(!fs.existsSync(path.join(backup,'manifest.json'))) {
        if(fs.existsSync(backup))S.safeRemove(root,backupRelative);
        fs.mkdirSync(backup,{recursive:true});
        fs.cpSync(source,path.join(backup,'app'),{recursive:true,errorOnExist:true,force:false});
        await S.verify(path.join(backup,'app'),sourceManifest);
        S.atomicJSON(path.join(backup,'manifest.json'),{...record,files:sourceManifest});
      } else {await S.verify(path.join(backup,'app'),S.readJSON(path.join(backup,'manifest.json')).files);}
      options.progress?.('Preparing a separate candidate');
      fs.mkdirSync(candidate,{recursive:true});
      fs.cpSync(path.join(backup,'app'),app,{recursive:true});
      options.failAt?.('copied');
      options.progress?.('Patching archive and verifying compatibility');
      const adapter=await (options.patch||patch)(app,payload);
      options.failAt?.('patched');
      options.progress?.('Checking isolated startup');
      const health=await (options.smoke||smoke)(app,root,id);
      if(!health.passed)throw Error('Launch verification failed');
      // Re-read source after preparation. If Store updated it during this
      // operation, do not activate a candidate from a stale/mixed source.
      await S.verify(source,sourceManifest);
      const files=await S.tree(app);
      S.atomicJSON(path.join(candidate,'record.json'),{...record,backup:backupRelative,adapter,health,files});
      S.atomicJSON(journal,{...record,phase:'validated',previous:current.active});
      options.failAt?.('validated');
      options.progress?.('Activating verified version');
      const previous=[current.active,...current.previous].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
      const next={schema:1,active:id,previous:previous.slice(0,2),blocked:null};
      S.atomicJSON(path.join(root,'state.json'),next);
      S.atomicJSON(journal,{...record,phase:'committed',previous:current.active});
      log(root,'installed',{id,sourceVersion:record.sourceVersion});
      // Cleanup only after activation, and only retired owned generation
      // directories. Retain the original snapshots used by kept versions.
      for(const retired of previous.slice(2))try{S.safeRemove(root,'versions/'+retired);}catch(e){log(root,'cleanup-deferred',{reason:e.message});}
      pruneOriginals(root,next);
      return {active:id,health};
    } catch(error) {
      // If pointer commit completed, never overwrite it with the old state.
      // A journal/log failure after commit must preserve that valid generation.
      if(S.state(root).active!==id) {
        S.atomicJSON(path.join(root,'state.json'),{...current,blocked:candidateKey});
        try{S.safeRemove(root,'versions/'+id);}catch{}
        S.atomicJSON(journal,{...record,phase:'failed',reason:error.message,previous:current.active});
      }
      log(root,'install-failed',{id,reason:error.message});throw error;
    }
  });
}
function pruneOriginals(root,state) {
  const keep=new Set([state.active,...state.previous].filter(Boolean).map(id=>S.readJSON(path.join(S.version(root,id),'record.json')).backup));
  for(const name of fs.readdirSync(S.inside(root,'backups'))) {
    if(!/^original-[a-f0-9]{20}$/.test(name)||keep.has('backups/'+name))continue;
    try{S.safeRemove(root,'backups/'+name);}catch(e){log(root,'cleanup-deferred',{reason:e.message});}
  }
}
async function verifyVersion(root,id) {
  const dir=S.version(root,id),record=S.readJSON(path.join(dir,'record.json'));
  await S.verify(path.join(dir,'app'),record.files);
  return record;
}
async function rollback(root,id) {
  root=S.init(root);
  return S.withLock(root,async()=>{
    const old=S.state(root),target=id||old.previous[0];
    if(!target || !old.previous.includes(target))throw Error('Choose a retained previous version from backup list');
    await verifyVersion(root,target);
    const blocked=old.active?S.readJSON(path.join(S.version(root,old.active),'record.json')).candidateKey:old.blocked;
    const next={schema:1,active:target,previous:[old.active,...old.previous.filter(x=>x!==target)].filter(Boolean).slice(0,2),blocked};
    S.atomicJSON(path.join(root,'state.json'),next);log(root,'rollback',{target});return next;
  });
}
async function original(root) {
  root=S.init(root);
  return S.withLock(root,async()=>{
    const old=S.state(root);
    const blocked=old.active?S.readJSON(path.join(S.version(root,old.active),'record.json')).candidateKey:old.blocked;
    const next={schema:1,active:null,previous:[old.active,...old.previous].filter(Boolean).slice(0,2),blocked};
    S.atomicJSON(path.join(root,'state.json'),next);log(root,'original-restored');return next;
  });
}
function backups(root) {
  const state=S.state(root);
  const versions=[state.active,...state.previous].filter(Boolean).map(id=>{
    const r=S.readJSON(path.join(S.version(root,id),'record.json'));
    return {id,type:state.active===id?'active':'previous',sourceVersion:r.sourceVersion,created:r.created};
  });
  const originals=fs.existsSync(path.join(root,'backups'))?fs.readdirSync(path.join(root,'backups')).filter(x=>fs.existsSync(path.join(root,'backups',x,'manifest.json'))).map(name=>({id:name,type:'original'})):[];
  return [...versions,...originals];
}
async function doctor(root) {
  if(!fs.existsSync(root))return {installed:false};
  S.init(root);const state=S.state(root),issues=[];
  for(const id of [state.active,...state.previous].filter(Boolean))try{await verifyVersion(root,id);}catch(e){issues.push(e.message);}
  for(const name of fs.readdirSync(S.inside(root,'backups')))try{
    const dir=S.inside(root,'backups/'+name);
    const record=S.readJSON(path.join(dir,'manifest.json'));await S.verify(path.join(dir,'app'),record.files);
  }catch(e){issues.push(e.message);}
  const interrupted=fs.readdirSync(S.inside(root,'transactions')).filter(n=>n.endsWith('.json')).map(n=>S.readJSON(S.inside(root,'transactions/'+n))).filter(r=>['preparing','validated'].includes(r.phase)&&r.id!==state.active).map(r=>r.id);
  return {installed:!!state.active,state,issues,interrupted,healthy:issues.length===0};
}
module.exports={install,rollback,original,backups,doctor,verifyVersion,log,available};
