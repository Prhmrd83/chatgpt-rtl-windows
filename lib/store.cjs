'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function inside(root, relative) {
  const target = path.resolve(root, relative);
  const rel = path.relative(path.resolve(root), target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Unsafe managed path: ' + relative);
  let cursor = path.resolve(root);
  for (const part of rel.split(path.sep)) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw Error('Reparse/symlink path refused: ' + cursor);
  }
  return target;
}
function atomicJSON(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  const fd = fs.openSync(temp, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
}
async function fileHash(file) {
  const digest = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}
async function tree(root) {
  const result = [];
  async function visit(dir) {
    for (const item of fs.readdirSync(dir, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const full = path.join(dir, item.name);
      if (item.isSymbolicLink()) throw Error('Source symlink/reparse point refused: ' + full);
      if (item.isDirectory()) await visit(full);
      else if (item.isFile()) result.push({path:path.relative(root,full).split(path.sep).join('/'),size:fs.statSync(full).size,sha256:await fileHash(full)});
      else throw Error('Unsupported filesystem entry: ' + full);
    }
  }
  await visit(root);
  return result;
}
async function verify(root, manifest) {
  const actual = await tree(root);
  if (JSON.stringify(actual)!==JSON.stringify(manifest)) throw Error('Backup/application integrity verification failed: ' + root);
}
function rootCheck(root) {
  root = path.resolve(root);
  const banned = [path.parse(root).root, process.env.USERPROFILE, process.env.LOCALAPPDATA, process.env.ProgramFiles].filter(Boolean).map(p=>path.resolve(p).toLowerCase());
  if (banned.includes(root.toLowerCase()) || /[\\/]WindowsApps(?:[\\/]|$)/i.test(root)) throw Error('Unsafe managed root');
  // Check ancestors too: a managed root must never be reached through a junction.
  for (let p=root; p!==path.dirname(p); p=path.dirname(p)) {
    if(fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw Error('Managed root traverses a reparse point');
  }
  return root;
}
function init(root) {
  root=rootCheck(root);
  fs.mkdirSync(root,{recursive:true});
  const marker=path.join(root,'.chatgpt-rtl-owned');
  if (!fs.existsSync(marker)) {
    if(fs.readdirSync(root).length) throw Error('Managed root must be empty on first use');
    fs.writeFileSync(marker,'chatgpt-rtl/v1\n',{flag:'wx'});
  }
  if(fs.readFileSync(marker,'utf8')!=='chatgpt-rtl/v1\n') throw Error('Invalid ownership marker');
  for(const dir of ['versions','backups','transactions','logs']) fs.mkdirSync(inside(root,dir),{recursive:true});
  return root;
}
function state(root) {
  const file=path.join(root,'state.json');
  return fs.existsSync(file)?readJSON(file):{schema:1,active:null,previous:[],blocked:null};
}
function withLock(root, task) {
  const file=path.join(root,'operation.lock');
  let fd;
  try {fd=fs.openSync(file,'wx');}
  catch(e) {
    if(e.code!=='EEXIST') throw e;
    const old=readJSON(file);
    try {process.kill(old.pid,0); throw Error('Another operation is running; try again later.');}
    catch(err) {if(err.code!=='ESRCH') throw err;}
    fs.unlinkSync(file);
    fd=fs.openSync(file,'wx');
  }
  fs.writeFileSync(fd,JSON.stringify({pid:process.pid,started:new Date().toISOString()}));fs.closeSync(fd);
  return Promise.resolve().then(task).finally(()=>fs.unlinkSync(file));
}
function version(root,id) {
  if(!/^[a-z0-9-]+$/i.test(id)) throw Error('Invalid version identifier');
  return inside(root,'versions/'+id);
}
function safeRemove(root,relative) { fs.rmSync(inside(root,relative),{recursive:true,force:true}); }

module.exports={inside,atomicJSON,fileHash,hash,readJSON,tree,verify,init,state,withLock,version,safeRemove,rootCheck};
