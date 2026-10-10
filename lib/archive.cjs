'use strict';
// ASAR hash replacement and app-contained-core handling derive from RT-AI
// patch.ps1, MIT, Copyright 2026 RT-AI / Roi Itach. See LICENSE and NOTICE.
const fs=require('node:fs');
const path=require('node:path');
const {Readable}=require('node:stream');
const {hash,inside,fileHash}=require('./store.cjs');

function headerHash(file) {
  const fd=fs.openSync(file,'r');
  try {
    const prefix=Buffer.alloc(16);
    if(fs.readSync(fd,prefix,0,16,0)!==16) throw Error('Truncated ASAR prefix');
    const size=prefix.readUInt32LE(12);
    if(size<1 || size>64*1024*1024) throw Error('Invalid ASAR header size');
    const data=Buffer.alloc(size);
    if(fs.readSync(fd,data,0,size,16)!==size) throw Error('Truncated ASAR header');
    JSON.parse(data.toString('utf8'));
    return hash(data);
  } finally {fs.closeSync(fd);}
}
function replaceHash(bytes,oldHash,newHash) {
  if(!/^[0-9a-f]{64}$/.test(oldHash) || !/^[0-9a-f]{64}$/.test(newHash)) throw Error('Invalid hash');
  const output=Buffer.from(bytes),needle=Buffer.from(oldHash),replacement=Buffer.from(newHash);
  let count=0,pos=0;
  while((pos=output.indexOf(needle,pos))!==-1){replacement.copy(output,pos);pos+=64;count++;}
  return {bytes:output,count};
}
function coreManifest(text) {
  const manifest=JSON.parse(text);
  if(manifest.name!=='openai-codex-electron') throw Error('Unsupported application identity');
  const value=manifest.codexWindowsAppContainedCore;
  if(value!==undefined && !['0','1',0,1].includes(value)) throw Error('Unknown app-contained-core setting');
  return text.replace(/("codexWindowsAppContainedCore"\s*:\s*)("1"|1)(?=\s*[,}])/g,'$1"0"');
}
function entryFromHTML(html) {
  const entries=[...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/g),...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*\btype=["']module["'][^>]*>/g)].map(m=>m[1]);
  const unique=[...new Set(entries)];
  if(unique.length!==1) throw Error('Expected one module entry in webview/index.html; unknown layout');
  const src=unique[0].replace(/^\.\//,'').replace(/^\//,'');
  if(src.includes('..') || src.includes('\\') || /^[a-z]+:/i.test(src)) throw Error('Unsafe webview entry');
  return 'webview/'+src;
}
async function patch(app,payload) {
  const asar=await import('@electron/asar');
  const archive=path.join(app,'resources','app.asar'),oldHash=headerHash(archive);
  const original=asar.getRawHeader(archive).header;
  const manifestText=asar.extractFile(archive,'package.json').toString('utf8');
  // Recognized native windows have distinct HTML/module entries. Ground each
  // entry in its HTML instead of guessing bundle names or patching all JS.
  const pages=['webview/index.html'];
  if(original.files.webview?.files?.['detached-window.html'])pages.push('webview/detached-window.html');
  const entries=[...new Set(pages.map(page=>entryFromHTML(asar.extractFile(archive,path.normalize(page)).toString('utf8'))))];
  const entry=entries[0],originalEntries=new Map();
  for(const moduleEntry of entries){
    const js=asar.extractFile(archive,path.normalize(moduleEntry)).toString('utf8');
    if(js.includes('RT-AI CODEX RTL PATCH START') || js.includes('__CHATGPT_RTL_PATCH__')) throw Error('Source is already patched; use the original Store app');
    originalEntries.set(moduleEntry,js);
  }
  const assetFiles=original.files.webview?.files?.assets?.files||{};
  const editorModules=new Set();
  for(const name of Object.keys(assetFiles).filter(name=>/^text-file-editor-extensions-[a-f0-9]+\.js$/.test(name))){
    const editorSource=asar.extractFile(archive,path.normalize('webview/assets/'+name)).toString('utf8');
    for(const match of editorSource.matchAll(/from\s*["']\.\/([a-zA-Z0-9_.-]+\.js)["']/g)){
      if(!assetFiles[match[1]])continue;
      const dependency=asar.extractFile(archive,path.normalize('webview/assets/'+match[1])).toString('utf8');
      if(dependency.includes('bidiIsolatedRanges')&&dependency.includes('appendConfig'))editorModules.add('/assets/'+match[1]);
    }
  }
  const editorModule=editorModules.size===1?[...editorModules][0]:null;
  const prefix=(editorModule?'window.__CHATGPT_RTL_EDITOR_MODULE__='+JSON.stringify(editorModule)+';\n':'')+payload+'\n';
  // Prefixing does not change the module's relative imports. Use LF UTF-8,
  // without the BOM inserted by Windows PowerShell 5.1 Set-Content.
  const changes=new Map([...originalEntries].map(([name,js])=>[name,Buffer.from(prefix+js)]));
  changes.set('package.json',Buffer.from(coreManifest(manifestText)));
  const streams=[];
  function visit(files,prefix='') {
    for(const [name,node] of Object.entries(files)) {
      const relative=prefix+name;
      inside(app,relative);
      if(node.link) throw Error('Archive links require a separately tested compatibility adapter');
      if(node.files) {
        streams.push({path:relative,type:'directory',unpacked:!!node.unpacked});visit(node.files,relative+'/');
      } else {
        const changed=changes.get(relative);
        streams.push({path:relative,type:'file',unpacked:!!node.unpacked,stat:{size:changed?changed.length:node.size,mode:node.executable?0o100755:0o100644},streamGenerator:()=>changed?Readable.from([changed]):node.unpacked?fs.createReadStream(inside(archive+'.unpacked',relative)):Readable.from([asar.extractFile(archive,path.normalize(relative))])});
      }
    }
  }
  visit(original.files);
  const output=path.join(app,'resources','app-rtl.asar');
  await asar.createPackageFromStreams(output,streams);
  const newHash=headerHash(output);
  let total=0;
  for(const exe of ['ChatGPT.exe','Codex.exe']) {
    const file=path.join(app,exe);if(!fs.existsSync(file))continue;
    const result=replaceHash(fs.readFileSync(file),oldHash,newHash);
    if(result.count){fs.writeFileSync(file,result.bytes);total+=result.count;}
  }
  if(total===0) throw Error('No known embedded ASAR hash found; compatibility not established');
  for(const [name,js] of originalEntries)if(asar.extractFile(output,path.normalize(name)).toString('utf8')!==prefix+js)throw Error('Payload verification failed');
  const after=asar.getRawHeader(output).header;
  async function checkFiles(files,prefix='') {
    for(const [name,node] of Object.entries(files)) {
      const rel=prefix+name;
      if(node.files){await checkFiles(node.files,rel+'/');continue;}
      const next=asar.statFile(output,path.normalize(rel));
      if(!!next.unpacked!==!!node.unpacked)throw Error('Unpacked layout changed: '+rel);
      if(!changes.has(rel)) {
        // Native files can be rebuilt after the vendor generated its header.
        // Compare actual pristine bytes, not potentially stale unpacked hashes.
        const beforeHash=node.unpacked?await fileHash(inside(archive+'.unpacked',rel)):hash(asar.extractFile(archive,path.normalize(rel)));
        if(next.integrity.hash!==beforeHash)throw Error('Unexpected archive content change: '+rel);
      }
    }
  }
  await checkFiles(original.files);
  if(!after.files)throw Error('Invalid repacked header');
  fs.renameSync(output,archive);
  asar.uncache(archive);
  asar.uncache(output);
  // Original unpacked files already exist and have identical content. Preserve
  // that tree; the writer's duplicate output is only removed within our stage.
  if(fs.existsSync(output+'.unpacked'))fs.rmSync(output+'.unpacked',{recursive:true});
  return {entry,entries,editorModule,oldHash,newHash,hashReferences:total,modified:['resources/app.asar','ChatGPT.exe / Codex.exe']};
}
module.exports={headerHash,replaceHash,coreManifest,entryFromHTML,patch};
