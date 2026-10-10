'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const S=require('../lib/store.cjs');
const A=require('../lib/archive.cjs');
const M=require('../lib/manager.cjs');
const {run}=require('../cli.cjs');

function fixture(t) {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'chatgpt-rtl-test-'));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const source=path.join(base,'source'),root=path.join(base,'managed');
  fs.mkdirSync(path.join(source,'resources'),{recursive:true});
  fs.writeFileSync(path.join(source,'ChatGPT.exe'),'synthetic executable');
  fs.writeFileSync(path.join(source,'resources/app.asar'),'synthetic archive');
  const payload=path.join(base,'payload.js');fs.writeFileSync(payload,'payload');
  const options={root,source,payload,sourceVersion:'fixture-1',patch:async app=>{fs.appendFileSync(path.join(app,'resources/app.asar'),' patched');return {fixture:true};},smoke:async()=>({passed:true,fixture:true})};
  return {base,source,root,payload,options};
}
test('byte-preserving embedded hash replacement',()=>{
  const old='a'.repeat(64),next='b'.repeat(64),prefix=Buffer.from([0,128,255]);
  const bytes=Buffer.concat([prefix,Buffer.from(old),Buffer.from([17]),Buffer.from(old)]);
  const result=A.replaceHash(bytes,old,next);
  assert.equal(result.count,2);assert.equal(result.bytes.length,bytes.length);
  assert.deepEqual(result.bytes.subarray(0,3),prefix);assert.equal(result.bytes[67],17);
});
test('invalid hash and malformed ASAR refused',t=>{
  assert.throws(()=>A.replaceHash(Buffer.alloc(4),'oops','b'.repeat(64)));
  const f=fixture(t);assert.throws(()=>A.headerHash(path.join(f.source,'resources/app.asar')));
});
test('only supported manifest identity and core flag accepted',()=>{
  const input='{"name":"openai-codex-electron","codexWindowsAppContainedCore":"1","other":1}';
  assert.equal(JSON.parse(A.coreManifest(input)).codexWindowsAppContainedCore,'0');
  assert.equal(JSON.parse(A.coreManifest(input)).other,1);
  assert.throws(()=>A.coreManifest('{"name":"unknown"}'));
  assert.throws(()=>A.coreManifest('{"name":"openai-codex-electron","codexWindowsAppContainedCore":"future"}'));
});
test('entry requires one grounded module path',()=>{
  assert.equal(A.entryFromHTML('<script type="module" src="./assets/index-a.js"></script>'),'webview/assets/index-a.js');
  assert.equal(A.entryFromHTML("<script src='assets/index-a.js' type='module'></script>"),'webview/assets/index-a.js');
  for(const html of ['<script src="x.js"></script>','<script type="module" src="../../a.js"></script>','<script type="module" src="https://x/a.js"></script>','<script type="module" src="a.js"></script><script type="module" src="b.js"></script>'])assert.throws(()=>A.entryFromHTML(html));
});
test('path traversal and filesystem root refused',t=>{
  const f=fixture(t);S.init(f.root);
  assert.throws(()=>S.inside(f.root,'../source'));assert.throws(()=>S.inside(f.root,f.source));
  assert.throws(()=>S.init(path.parse(f.root).root));
  assert.throws(()=>S.version(f.root,'../../source'));
});
test('nonempty unowned installation refused',t=>{
  const f=fixture(t);fs.mkdirSync(f.root);fs.writeFileSync(path.join(f.root,'important.txt'),'keep');
  assert.throws(()=>S.init(f.root));assert.equal(fs.readFileSync(path.join(f.root,'important.txt'),'utf8'),'keep');
});
test('lock serializes concurrent operations',async t=>{
  const f=fixture(t);S.init(f.root);let release;
  const held=S.withLock(f.root,()=>new Promise(resolve=>{release=resolve;}));
  await new Promise(r=>setImmediate(r));assert.throws(()=>S.withLock(f.root,async()=>{}));
  release();await held;assert.equal(await S.withLock(f.root,async()=>42),42);
});
test('install verifies backup and leaves original untouched',async t=>{
  const f=fixture(t),before=await S.tree(f.source);
  const result=await M.install(f.options);assert.ok(result.active);await S.verify(f.source,before);
  const record=await M.verifyVersion(f.root,result.active);
  await S.verify(path.join(f.root,record.backup,'app'),before);
  assert.equal((await M.doctor(f.root)).healthy,true);
});
for(const phase of ['copied','patched','validated'])test('failure at '+phase+' preserves active generation',async t=>{
  const f=fixture(t),first=await M.install(f.options);
  fs.appendFileSync(path.join(f.source,'resources/app.asar'),' update');
  await assert.rejects(M.install({...f.options,failAt:p=>{if(p===phase)throw Error('simulated failure');}}));
  assert.equal(S.state(f.root).active,first.active);await M.verifyVersion(f.root,first.active);
  await assert.rejects(M.install(f.options),/blocked/);
  assert.ok((await M.install({...f.options,retry:true})).active);
});
test('failed startup preserves old version',async t=>{
  const f=fixture(t),first=await M.install(f.options);fs.appendFileSync(path.join(f.source,'resources/app.asar'),' new');
  await assert.rejects(M.install({...f.options,smoke:async()=>({passed:false})}));assert.equal(S.state(f.root).active,first.active);
});
test('source changing during preparation prevents activation',async t=>{
  const f=fixture(t);
  await assert.rejects(M.install({...f.options,smoke:async()=>{fs.appendFileSync(path.join(f.source,'resources/app.asar'),' raced');return {passed:true};}}));
  assert.equal(S.state(f.root).active,null);
});
test('tampered pristine backup prevents an update',async t=>{
  const f=fixture(t),first=await M.install(f.options),record=await M.verifyVersion(f.root,first.active);
  fs.appendFileSync(path.join(f.root,record.backup,'app','ChatGPT.exe'),' corrupt');
  fs.appendFileSync(f.payload,' second');
  await assert.rejects(M.install(f.options),/integrity/);assert.equal(S.state(f.root).active,first.active);
});
test('rollback verifies snapshot and blocks the rejected candidate',async t=>{
  const f=fixture(t),first=await M.install(f.options);fs.appendFileSync(path.join(f.source,'resources/app.asar'),' second');
  const second=await M.install(f.options);assert.notEqual(first.active,second.active);
  const result=await M.rollback(f.root);assert.equal(result.active,first.active);
  await assert.rejects(M.install(f.options),/blocked/);
});
test('tampered rollback target is refused',async t=>{
  const f=fixture(t),first=await M.install(f.options);fs.appendFileSync(path.join(f.source,'resources/app.asar'),' second');
  const second=await M.install(f.options);fs.appendFileSync(path.join(S.version(f.root,first.active),'app','ChatGPT.exe'),' corrupt');
  await assert.rejects(M.rollback(f.root),/integrity/);assert.equal(S.state(f.root).active,second.active);
});
test('original rollback disables active copy and retains snapshots',async t=>{
  const f=fixture(t),first=await M.install(f.options),before=await S.tree(f.source);
  await M.original(f.root);assert.equal(S.state(f.root).active,null);
  assert.ok(M.backups(f.root).some(x=>x.id===first.active));await S.verify(f.source,before);
});
test('retention keeps two previous healthy generations',async t=>{
  const f=fixture(t),ids=[];
  for(let i=0;i<4;i++){fs.appendFileSync(path.join(f.source,'resources/app.asar'),String(i));ids.push((await M.install(f.options)).active);}
  assert.equal(S.state(f.root).previous.length,2);assert.equal(fs.existsSync(S.version(f.root,ids[0])),false);
  assert.equal(fs.readdirSync(path.join(f.root,'backups')).length,3);
});
test('disk-space preflight rejects impossible size',t=>{
  const f=fixture(t);S.init(f.root);assert.throws(()=>M.available(f.root,Number.MAX_SAFE_INTEGER),/disk space/);
});
test('doctor reports interrupted preparation without activating it',async t=>{
  const f=fixture(t);S.init(f.root);S.atomicJSON(path.join(f.root,'transactions/interrupted.json'),{id:'interrupted',phase:'validated'});
  assert.deepEqual((await M.doctor(f.root)).interrupted,['interrupted']);assert.equal(S.state(f.root).active,null);
});
test('launch uses one stable owned profile across generations',async t=>{
  const f=fixture(t);await M.install(f.options);
  const first=await run(['launch-path','--root',f.root]);
  assert.equal(first.profile,path.join(f.root,'profile'));assert.ok(fs.existsSync(first.profile));
  fs.appendFileSync(path.join(f.source,'resources/app.asar'),' update');await M.install(f.options);
  const next=await run(['launch-path','--root',f.root]);assert.equal(next.profile,first.profile);assert.notEqual(next.exe,first.exe);
});
test('critical-file corruption refuses launch-path',async t=>{
  const f=fixture(t),first=await M.install(f.options);
  fs.appendFileSync(path.join(S.version(f.root,first.active),'app','ChatGPT.exe'),' tampered');
  await assert.rejects(run(['launch-path','--root',f.root]),/Critical application integrity/);
});
test('real ASAR adapter preserves untouched content and unpacked flags',async t=>{
  const f=fixture(t),asar=await import('@electron/asar'),input=path.join(f.base,'archive-input');
  fs.mkdirSync(path.join(input,'webview/assets'),{recursive:true});
  fs.writeFileSync(path.join(input,'package.json'),'{"name":"openai-codex-electron","codexWindowsAppContainedCore":"1"}');
  fs.writeFileSync(path.join(input,'webview/index.html'),'<script type="module" src="./assets/index.js"></script>');
  fs.writeFileSync(path.join(input,'webview/assets/index.js'),'console.log("fixture");');
  fs.writeFileSync(path.join(input,'webview/detached-window.html'),'<script type="module" src="./assets/detached.js"></script>');
  fs.writeFileSync(path.join(input,'webview/assets/detached.js'),'console.log("detached fixture");');
  fs.writeFileSync(path.join(input,'webview/assets/text-file-editor-extensions-ab1234.js'),'import {x} from "./dist-fixture.js";');
  fs.writeFileSync(path.join(input,'webview/assets/dist-fixture.js'),'// bidiIsolatedRanges appendConfig');
  fs.writeFileSync(path.join(input,'native.node'),Buffer.from([0,1,255,128]));
  const file=path.join(f.source,'resources/app.asar');
  await asar.createPackageWithOptions(input,file,{unpack:'*.node'});
  const old=A.headerHash(file);fs.writeFileSync(path.join(f.source,'ChatGPT.exe'),Buffer.concat([Buffer.from([0,255]),Buffer.from(old)]));
  const result=await A.patch(f.source,'// test payload');
  assert.deepEqual(result.entries,['webview/assets/index.js','webview/assets/detached.js']);
  assert.equal(result.editorModule,'/assets/dist-fixture.js');
  const prefix='window.__CHATGPT_RTL_EDITOR_MODULE__="/assets/dist-fixture.js";\n// test payload\n';
  assert.equal(asar.extractFile(file,path.normalize('webview/assets/index.js')).toString(),prefix+'console.log("fixture");');
  assert.equal(asar.extractFile(file,path.normalize('webview/assets/detached.js')).toString(),prefix+'console.log("detached fixture");');
  assert.equal(asar.statFile(file,'native.node').unpacked,true);
  assert.deepEqual(asar.extractFile(file,'native.node'),Buffer.from([0,1,255,128]));
  assert.equal(JSON.parse(asar.extractFile(file,'package.json')).codexWindowsAppContainedCore,'0');
  assert.equal(fs.readFileSync(path.join(f.source,'ChatGPT.exe')).subarray(2).toString(),A.headerHash(file));
});
