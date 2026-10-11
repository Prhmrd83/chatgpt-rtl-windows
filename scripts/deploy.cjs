'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const S=require('../lib/store.cjs');
const [source,inputRoot]=process.argv.slice(2);
const root=S.init(inputRoot);
S.withLock(root,async()=>{
  const target=S.inside(root,'controller');
  if(path.resolve(source)===target)return;
  const id=crypto.randomUUID(),stageName='controller-stage-'+id,oldName='controller-old-'+id;
  const stage=S.inside(root,stageName),old=S.inside(root,oldName);
  fs.mkdirSync(stage);
  const items=['lib','scripts','assets','node_modules','cli.cjs','payload.js','chatgpt-rtl.cmd','chatgpt-rtl.ps1','package.json','package-lock.json','LICENSE','NOTICE.md'];
  // Verify the deployed controller against the selected source files, not
  // against the destination or unrelated contents of the downloaded folder.
  const expected=[];
  for(const item of [...items].sort((a,b)=>a.localeCompare(b))) {
    const file=path.join(source,item),stat=fs.lstatSync(file);
    if(stat.isSymbolicLink())throw Error('Controller symlink/reparse point refused: '+file);
    if(stat.isDirectory())expected.push(...(await S.tree(file)).map(entry=>({...entry,path:item+'/'+entry.path})));
    else if(stat.isFile())expected.push({path:item,size:stat.size,sha256:await S.fileHash(file)});
    else throw Error('Unsupported controller entry: '+file);
  }
  for(const item of items)fs.cpSync(path.join(source,item),path.join(stage,item),{recursive:true});
  await S.verify(stage,expected);
  if(fs.existsSync(target))fs.renameSync(target,old);
  try{fs.renameSync(stage,target);}catch(e){if(fs.existsSync(old))fs.renameSync(old,target);throw e;}
  // Keep the immediate previous controller in case a process still holds it.
  for(const name of fs.readdirSync(root))if(/^controller-old-[a-f0-9-]+$/.test(name)&&name!==oldName)try{S.safeRemove(root,name);}catch{}
}).catch(e=>{console.error(e.message);process.exitCode=1;});
