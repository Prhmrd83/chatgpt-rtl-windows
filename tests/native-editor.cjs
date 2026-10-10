'use strict';
const fs=require('node:fs');
const {literalOrder}=require('./fixture.cjs');
const {languages}=require('./surfaces.cjs');
const text=languages.map(x=>x[1]).concat(['نتیجهٔ محاسبه 2 + 3 = 5 در نسخهٔ 1.2.3 به تاریخ 2026-10-09 درست است.','برای اطلاعات بیشتر https://example.com/a?x=1&y=2 را ببینید.']).join('\n');
async function runNativeEditor(browser,{outputDirectory}={}) {
 const checks=[];const check=(name,pass,detail)=>checks.push({name,pass,detail});
 try {
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
  await page.evaluate(async text=>{
   const module=await import(window.__CHATGPT_RTL_EDITOR_MODULE__),values=Object.values(module);
   const EditorView=values.find(v=>v?.findFromDOM&&v?.bidiIsolatedRanges),EditorState=values.find(v=>v?.create&&v?.tabSize&&v?.allowMultipleSelections);
   if(!EditorView||!EditorState)throw Error('Native CodeMirror APIs unavailable');
   const parent=document.createElement('section');parent.id='rtl-native-editor-test';parent.style.cssText='position:fixed;top:50px;right:15px;width:850px;height:550px;z-index:2147483600;background:#202123;color:#eee;padding:18px;border:1px solid #777;overflow:auto';
   const heading=document.createElement('h2');heading.textContent='Native CodeMirror integration test';parent.appendChild(heading);document.body.appendChild(parent);
   const model=EditorState.create({doc:text,extensions:[EditorView.lineWrapping]});
   window.__nativeRTLEditor=new EditorView({state:model,parent});
   window.__nativeRTLEditor.contentDOM.id='rtl-native-editor-content';window.__nativeRTLEditor.contentDOM.setAttribute('data-language','plaintext');
   window.__RT_AI_CODEX_RTL_INFO__.rescan();
  },text);
  await page.waitForFunction(()=>window.__CHATGPT_RTL_PATCH__.coverage().codeMirrorAdapters>0||window.__CHATGPT_RTL_PATCH__.coverage().editorFailures.length>0,null,{timeout:12000});
  await page.waitForTimeout(700);
  const initial=await page.evaluate(()=>({coverage:window.__CHATGPT_RTL_PATCH__.coverage(),model:window.__nativeRTLEditor.state.doc.toString(),rows:[...window.__nativeRTLEditor.contentDOM.querySelectorAll('.cm-line')].map(e=>({direction:getComputedStyle(e).direction,align:getComputedStyle(e).textAlign,text:e.textContent})),isolated:[...window.__nativeRTLEditor.contentDOM.querySelectorAll('.chatgpt-rtl-ltr-run')].map(e=>e.textContent)}));
  check('native adapter active',initial.coverage.codeMirrorAdapters>0,initial.coverage);
  check('native adapter no errors',initial.coverage.editorFailures.length===0,initial.coverage.editorFailures);
  check('native model characters unchanged',initial.model===text);
  for(const [i,[language]] of languages.entries())check(language+' native line direction',initial.rows[i]?.direction===(language==='en'?'ltr':'rtl'),initial.rows[i]);
  for(const literal of ['ChatGPT','2 + 3 = 5','1.2.3','2026-10-09','https://example.com/a?x=1&y=2']){
   const order=await literalOrder(page,'rtl-native-editor-content',literal);check('native visual order '+literal,order.ltr,order);
  }
  const changed=await page.evaluate(()=>{
   const view=window.__nativeRTLEditor;view.dispatch({changes:{from:view.state.doc.length,insert:'\nمتن تازه با ChatGPT برای آزمون ویرایش.'}});return view.state.doc.toString();
  });await page.waitForTimeout(500);
  check('native edit keeps exact characters',changed===text+'\nمتن تازه با ChatGPT برای آزمون ویرایش.');
  check('native edit reclassifies new line',await page.evaluate(()=>getComputedStyle(window.__nativeRTLEditor.contentDOM.lastElementChild).direction==='rtl'));
  const select=await page.evaluate(()=>{
   const view=window.__nativeRTLEditor,from=view.state.doc.toString().indexOf('2 + 3 = 5'),to=from+'2 + 3 = 5'.length;
   view.dispatch({selection:{anchor:from,head:to}});return {selected:view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to),text:view.state.doc.toString()};
  });check('native selection maps to logical arithmetic',select.selected==='2 + 3 = 5');
  await page.evaluate(()=>{window.__nativeRTLEditor.contentDOM.setAttribute('data-language','javascript');window.__RT_AI_CODEX_RTL_INFO__.rescan()});await page.waitForTimeout(1700);
  check('native switch to code retires isolation',await page.evaluate(()=>!window.__nativeRTLEditor.contentDOM.querySelector('.chatgpt-rtl-ltr-run')));
  check('native switch to code keeps LTR lines',await page.evaluate(()=>[...window.__nativeRTLEditor.contentDOM.querySelectorAll('.cm-line')].every(e=>getComputedStyle(e).direction==='ltr')));
  check('native model unchanged by file type switch',await page.evaluate(()=>window.__nativeRTLEditor.state.doc.toString())===select.text);
  if(outputDirectory){fs.mkdirSync(outputDirectory,{recursive:true});await page.locator('#rtl-native-editor-test').screenshot({path:require('node:path').join(outputDirectory,'native-editor-library-test.png')});}
  const report={scope:'Actual vendor CodeMirror library inside native Electron, controlled test editor; not actual file-tab save/undo acceptance',checks,pass:checks.filter(x=>x.pass).length,total:checks.length};
  if(outputDirectory)fs.writeFileSync(require('node:path').join(outputDirectory,'native-editor-library-results.json'),JSON.stringify(report,null,2));return report;
 }finally{try{for(const page of browser.contexts().flatMap(c=>c.pages()))if(page.url()==='app://-/index.html')await page.evaluate(()=>{window.__nativeRTLEditor?.destroy();document.getElementById('rtl-native-editor-test')?.remove();delete window.__nativeRTLEditor;});}catch{}}
}
module.exports={runNativeEditor};

