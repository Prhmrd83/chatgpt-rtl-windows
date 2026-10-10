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
  for(const item of items)fs.cpSync(path.join(source,item),path.join(stage,item),{recursive:true});
  // Verify the deployed controller against the selected source files, not
  // against a manifest generated from the destination itself.
  const expected=(await S.tree(source)).filter(file=>items.some(item=>file.path===item||file.path.startsWith(item+'/')));
  await S.verify(stage,expected);
  if(fs.existsSync(target))fs.renameSync(target,old);
  try{fs.renameSync(stage,target);}catch(e){if(fs.existsSync(old))fs.renameSync(old,target);throw e;}
  // Keep the immediate previous controller in case a process still holds it.
  for(const name of fs.readdirSync(root))if(/^controller-old-[a-f0-9-]+$/.test(name)&&name!==oldName)try{S.safeRemove(root,name);}catch{}
}).catch(e=>{console.error(e.message);process.exitCode=1;});
