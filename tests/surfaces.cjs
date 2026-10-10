'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {waitPaint,literalOrder,getProbe}=require('./fixture.cjs');
const question='نام بسته و مستندات را به chatgpt-rtl-windows تغییر می‌دهم. برای تغییر نام خود ریپازیتوری در GitHub، ابزار متصل گزینهٔ Rename ندارد و مرورگر داخلی وارد حساب شما نیست. لطفاً در https://github.com/Prhmrd83/chatgpt-rtl/settings نام Repository را به chatgpt-rtl-windows تغییر دهید و خبر بدهید؛ آماده‌سازی و آزمایش بسته را ادامه می‌دهم.';
const languages=[['fa','ChatGPT برای نوشتن و بررسی متن فارسی و انگلیسی به ما کمک می‌کند.'],['ar','ChatGPT يساعدنا في كتابة النص العربي والإنجليزي بشكل صحيح.'],['he','ChatGPT עוזר לנו לכתוב ולבדוק טקסט בעברית ובאנגלית בצורה נכונה.'],['en','The Persian greeting سلام means hello in English.']];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
function surfaceHTML(){
 return `<!doctype html><html><head><meta charset="utf-8"><style>
 *{box-sizing:border-box}body{margin:0;background:#202123;color:#eee;font:16px/1.75 Arial,sans-serif;direction:ltr}main{width:920px;margin:16px auto}section{padding:18px;border:1px solid #555;border-radius:14px;margin-bottom:16px}h1{font-size:22px}h2{font-size:19px}
 .vendor-text{direction:ltr;text-align:left}.row{display:flex;align-items:center;gap:12px;direction:ltr}.grid{display:grid;grid-template-columns:28px 1fr;gap:8px}.icon{width:20px;display:inline-block}button{padding:6px 12px;background:#353637;color:inherit;border:1px solid #666;border-radius:8px;cursor:pointer}textarea,input[type=text]{width:100%;padding:10px;background:#303134;color:inherit;border:1px solid #666}pre{padding:12px;direction:ltr;white-space:pre}code{font-family:Consolas,monospace}[contenteditable]{border:1px solid #777;padding:12px;min-height:90px}a{color:#bce;overflow-wrap:anywhere}.leaf{display:block}.side-header{display:flex;justify-content:space-between;direction:ltr}ul{padding-inline-start:24px}blockquote{border-inline-start:4px solid #777;padding-inline-start:16px}#terminal{white-space:pre}
 </style></head><body><main>
 <section id="question" role="dialog"><div class="side-header"><span>Question</span><button id="close-question" aria-label="Close">×</button></div><div id="question-text" class="vendor-text">${escape(question)}</div><textarea id="reply" placeholder="Reply..."></textarea><div class="row" id="question-buttons"><button id="skip">Skip</button><button id="send">Send</button></div></section>
 <section id="plan"><div class="side-header"><span>Plan</span><button id="copy-plan">Copy</button></div><h1 id="plan-title" class="vendor-text">بهبود نمایش نصب و آیکون ChatGPT RTL</h1><h2>نمایش وضعیت نصب</h2><ul id="plan-list"><li id="plan-item" class="vendor-text">هنگام دانلود و نصب، نشانگر متحرک همراه با زمان سپری‌شده نمایش داده شود؛ حتی وقتی اینترنت کند است و دانلود خروجی جدیدی ندارد.</li><li>خروجی فعلی <code id="events-code">--events</code> حفظ شود و برنامه در Windows PowerShell اجرا شود.</li></ul><blockquote id="english-quote">Setup complete! A “ChatGPT RTL” shortcut has been added to your Desktop. Double-click it to open the app.</blockquote><p id="plan-arithmetic">نتیجهٔ محاسبه 2 + 3 = 5 در نسخهٔ 1.2.3 به تاریخ 2026-10-09 درست است.</p><a id="plan-link" href="https://example.com/a?x=1&y=2">برای اطلاعات بیشتر به https://example.com/a?x=1&y=2 مراجعه کنید.</a></section>
 <section id="surfaces">${languages.map(([id,text])=>`<div class="vendor-text leaf" id="doc-${id}">${escape(text)}</div><label class="vendor-text leaf" id="label-${id}" for="option-${id}">${escape(text)}</label><div class="row" id="option-row-${id}"><input id="option-${id}" type="radio" name="options"><span id="option-label-${id}" class="vendor-text">${escape(text)}</span></div><button class="row" id="button-${id}"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="white"/></svg>${escape(text)}</button><div role="tooltip" id="tooltip-${id}" class="vendor-text">${escape(text)}</div>`).join('')}<div class="row" id="bare-row"><svg width="16" height="16" aria-hidden="true"></svg>ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.<button id="bare-row-action">Action</button></div><div class="grid" id="grid-row"><span class="icon">✓</span><span id="grid-label">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</span></div></section>
 <section><h2>Text / Markdown editor</h2><div id="text-editor" contenteditable="true" role="textbox"><p id="editor-paragraph">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</p><p id="editor-english">English paragraph stays left aligned.</p></div><input id="text-input" type="text"><input id="email-input" type="email" value="name@example.com"><input id="url-input" type="url" value="https://example.com"><button id="save-document">Save</button></section>
 <section><pre id="code-view"><code id="code-content">const greeting = "سلام";\nconsole.log(greeting);</code></pre><div class="cm-editor"><div id="code-editor" contenteditable="true">const greeting = "سلام";</div></div><div id="terminal" class="xterm">$ echo "سلام"</div></section>
 <section><h2>Dynamic surfaces</h2><div id="dynamic"></div><div id="shadow-host"></div><div id="late-shadow-host"></div></section>
 </main></body></html>`;
}
async function runSurfaces(browser,{payload,outputDirectory,baseline=false}={}){
 const context=await browser.newContext({viewport:{width:1100,height:1000}});
 const page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const check=(name,pass,detail)=>checks.push({name,pass,detail});
 await page.setContent(surfaceHTML());
 const initial=await page.evaluate(()=>{
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
   window.__before={text:document.getElementById('question-text').textContent,editor:document.getElementById('text-editor').innerHTML,code:document.getElementById('code-content').innerHTML,buttons:[...document.querySelectorAll('#question-buttons button')].map(box),icons:[...document.querySelectorAll('[id^=button-] svg')].map(box),row:[...document.querySelectorAll('#bare-row svg,#bare-row-action')].map(box)};
   window.__clicks=0;document.getElementById('button-fa').onclick=()=>window.__clicks++;
   document.getElementById('save-document').onclick=()=>window.__saved=document.getElementById('text-editor').textContent;
   const root=document.getElementById('shadow-host').attachShadow({mode:'open'});
   root.innerHTML='<style>p{direction:ltr;text-align:left}pre{direction:ltr}</style><p id="shadow-text">ChatGPT برای نوشتن و بررسی متن فارسی و انگلیسی به ما کمک می‌کند.</p><pre id="shadow-code">const msg = "سلام";</pre>';
   return window.__before;
 });
 await page.addScriptTag({content:payload});await waitPaint(page);
 for(const id of ['question-text','plan-title','plan-item','plan-arithmetic','doc-fa','doc-ar','doc-he','label-fa','label-ar','label-he','tooltip-fa','tooltip-ar','tooltip-he','grid-label']){
   const probe=await getProbe(page,id);check(id+' RTL alignment',probe.side==='right',probe);
 }
 // An inline label has no spare width in which to align. Check its base
 // direction separately, without requiring the radio row itself to move.
 for(const id of ['option-label-fa','option-label-ar','option-label-he']){
   const probe=await getProbe(page,id);check(id+' RTL text direction',probe.direction==='rtl'&&probe.bidi==='isolate',probe);
 }
 for(const id of ['doc-en','label-en','option-label-en','tooltip-en','english-quote','editor-english']){
   const probe=await getProbe(page,id);check(id+' stays LTR',probe.direction==='ltr',probe);
 }
 for(const [id,literal] of [['question-text','chatgpt-rtl-windows'],['question-text','https://github.com/Prhmrd83/chatgpt-rtl/settings'],['plan-arithmetic','2 + 3 = 5'],['plan-arithmetic','1.2.3'],['plan-arithmetic','2026-10-09'],['plan-link','https://example.com/a?x=1&y=2']]){
   const order=await literalOrder(page,id,literal);check(id+' preserves '+literal,order.ltr,order);
 }
 const staticState=await page.evaluate(()=>{
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
   return {text:document.getElementById('question-text').textContent,editor:document.getElementById('text-editor').innerHTML,code:document.getElementById('code-content').innerHTML,buttonOrder:[...document.querySelectorAll('#question-buttons button')].map(e=>e.getBoundingClientRect().x),icons:[...document.querySelectorAll('[id^=button-] svg')].map(box),row:[...document.querySelectorAll('#bare-row svg,#bare-row-action')].map(box),href:document.getElementById('plan-link').getAttribute('href'),globalDir:[document.documentElement.dir,document.body.dir],label:document.getElementById('button-fa').textContent};
 });
 check('question logical text preserved',staticState.text===initial.text);
 check('editor child DOM preserved',staticState.editor===initial.editor);
 check('code DOM preserved',staticState.code===initial.code);
 check('question action order preserved',staticState.buttonOrder[0]<staticState.buttonOrder[1]);
 check('button icon horizontal positions preserved',staticState.icons.every((r,i)=>r.x===initial.icons[i].x));
 // Text shaping can change fractional CSS advances. Compare actual screen
 // pixel positions, while the original 29-check geometry remains unchanged.
 check('bare flex row controls keep pixel positions',staticState.row.every((r,i)=>Math.round(r.x)===Math.round(initial.row[i].x)));
 check('link destination preserved',staticState.href==='https://example.com/a?x=1&y=2');
 check('no global direction attributes',staticState.globalDir.every(x=>x===''));
 await page.locator('#button-fa').click();check('RTL button remains clickable',await page.evaluate(()=>window.__clicks===1));
 for(const id of ['code-content','code-editor','terminal','email-input','url-input'])check(id+' remains LTR',(await getProbe(page,id)).direction==='ltr');
 check('editor paragraph uses RTL',(await getProbe(page,'editor-paragraph')).direction==='rtl');
 await page.locator('#reply').fill(languages[0][1]);await page.locator('#text-input').fill(languages[0][1]);await waitPaint(page);
 check('question reply RTL',(await getProbe(page,'reply')).direction==='rtl');
 check('ordinary text input RTL',(await getProbe(page,'text-input')).direction==='rtl');
 await page.locator('#text-input').fill('English input returns to LTR.');await waitPaint(page);
 check('input returns to LTR',(await getProbe(page,'text-input')).direction==='ltr');
 await page.locator('#text-editor').fill('متن فارسی جدید با ChatGPT برای آزمایش نوشتن و ذخیره کردن.');await waitPaint(page);
 await page.locator('#save-document').click();check('save preserves entered characters',await page.evaluate(()=>window.__saved==='متن فارسی جدید با ChatGPT برای آزمایش نوشتن و ذخیره کردن.'));
 await page.evaluate(()=>{
   const el=document.getElementById('dynamic');el.innerHTML='<div id="streamed-panel">English starts here.</div>';window.__streamNode=el.firstChild.firstChild;
 });await waitPaint(page);
 await page.evaluate(()=>{window.__streamNode.data= 'ChatGPT برای نمایش متن فارسی و انگلیسی در پنل جدید بسیار مناسب است.'});await waitPaint(page);
 check('dynamic panel becomes RTL',(await getProbe(page,'streamed-panel')).direction==='rtl');
 check('framework text node remains connected',await page.evaluate(()=>window.__streamNode.isConnected));
 check('dynamic panel exact text',await page.locator('#streamed-panel').textContent()=== 'ChatGPT برای نمایش متن فارسی و انگلیسی در پنل جدید بسیار مناسب است.');
 await page.evaluate(()=>{window.__streamNode.data='English replacement.'});await waitPaint(page);
 check('dynamic panel returns LTR',(await getProbe(page,'streamed-panel')).direction==='ltr');
 check('dynamic update leaves no duplicate fragments',await page.locator('#streamed-panel').textContent()==='English replacement.');
 const shadow=await page.evaluate(()=>{const root=document.getElementById('shadow-host').shadowRoot;return {text:getComputedStyle(root.getElementById('shadow-text')).direction,code:getComputedStyle(root.getElementById('shadow-code')).direction}});
 check('open shadow root prose RTL',shadow.text==='rtl',shadow);check('open shadow root code LTR',shadow.code==='ltr',shadow);
 await page.evaluate(()=>{const root=document.getElementById('late-shadow-host').attachShadow({mode:'open'});root.innerHTML='<p id="late-text">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</p>'});
 await page.waitForTimeout(1700);
 check('late-attached shadow root discovered',await page.evaluate(()=>getComputedStyle(document.getElementById('late-shadow-host').shadowRoot.getElementById('late-text')).direction==='rtl'));
 const once=await page.locator('#question-text').innerHTML();
 await page.evaluate(()=>window.__RT_AI_CODEX_RTL_INFO__.rescan());await waitPaint(page);
 check('app-wide rescan idempotent',await page.locator('#question-text').innerHTML()===once);
 await page.evaluate(()=>{
   const node=document.getElementById('question-text').firstChild;const range=document.createRange();range.setStart(node,0);range.setEnd(node,Math.min(8,node.length));getSelection().removeAllRanges();getSelection().addRange(range);window.__selected=getSelection().toString();
   window.__RT_AI_CODEX_RTL_INFO__.rescan();
 });await waitPaint(page);
 check('read-only selection survives rescan',await page.evaluate(()=>getSelection().toString()===window.__selected));
 await page.evaluate(()=>{
   const label=document.getElementById('button-fa');window.__labelAnchor=label.childNodes[1];window.__labelAnchor.data='ChatGPT برای نمایش متن تازه در دکمه بسیار مناسب است.';
 });await waitPaint(page);
 check('control framework anchor stays connected',await page.evaluate(()=>window.__labelAnchor.isConnected));
 check('control framework update exact text',await page.locator('#button-fa').textContent()==='ChatGPT برای نمایش متن تازه در دکمه بسیار مناسب است.');
 await page.evaluate(()=>{document.getElementById('reply').value='English reset.'});await page.waitForTimeout(1700);
 check('controlled input reset returns LTR',(await getProbe(page,'reply')).direction==='ltr');
 await page.evaluate(()=>{
   const host=document.getElementById('dynamic');host.innerHTML='<div id="plain-source" class="cm-editor" data-language="plaintext"><div class="cm-line" id="plain-line">ChatGPT برای نمایش متن فارسی در فایل متنی بسیار مناسب است.</div></div><div id="change-context">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</div>';
 });await waitPaint(page);
 check('plain source adapter RTL',(await getProbe(page,'plain-line')).direction==='rtl');
 await page.evaluate(()=>{document.getElementById('plain-source').setAttribute('data-language','javascript');document.getElementById('change-context').setAttribute('data-language','javascript')});await waitPaint(page);
 check('plain source switched to code becomes LTR',(await getProbe(page,'plain-line')).direction==='ltr');
 check('prose switched to code retires RTL',(await getProbe(page,'change-context')).direction==='ltr');
 check('context change restores logical text',await page.locator('#change-context').textContent()==='ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.');
 await page.evaluate(()=>{
   const f=document.createElement('iframe');f.id='same-origin';f.srcdoc='<p id="frame-text">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</p>';document.getElementById('dynamic').appendChild(f);
 });await page.waitForTimeout(1700);
 check('same-origin embedded document RTL',await page.evaluate(()=>getComputedStyle(document.getElementById('same-origin').contentDocument.getElementById('frame-text')).direction==='rtl'));
 check('root coverage diagnostics available',await page.evaluate(()=>window.__CHATGPT_RTL_PATCH__.coverage().roots>=3));
 await page.evaluate(()=>{
   document.getElementById('dynamic').innerHTML='<div class="cm-editor" id="native-md"><div class="cm-scroller"><div class="cm-content" contenteditable="true" data-language="markdown"><div class="cm-line" id="native-md-line">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</div><div class="cm-line" id="native-en-line">English file text stays LTR.</div></div></div></div>';
   window.__nativeEditorBefore=document.querySelector('#native-md .cm-content').innerHTML;
 });await waitPaint(page);
 check('native Markdown metadata on content is detected',(await getProbe(page,'native-md-line')).direction==='rtl');
 check('native Markdown English line stays LTR',(await getProbe(page,'native-en-line')).direction==='ltr');
 check('native Markdown model DOM unchanged',await page.evaluate(()=>document.querySelector('#native-md .cm-content').innerHTML===window.__nativeEditorBefore));
 await page.evaluate(()=>{document.querySelector('#native-md .cm-content').setAttribute('data-language','javascript')});await waitPaint(page);
 check('native tab switches to code without RTL',(await getProbe(page,'native-md-line')).direction==='ltr');
 await page.evaluate(()=>{document.querySelector('#native-md .cm-content').setAttribute('data-language','plaintext')});await waitPaint(page);
 check('native tab returns to plaintext RTL',(await getProbe(page,'native-md-line')).direction==='rtl');
 await page.evaluate(()=>{
   const content=document.querySelector('#native-md .cm-content');
   content.setAttribute('data-language','markdown');
   content.insertAdjacentHTML('beforeend','<div class="cm-line cm-markdown-code-line" data-language="javascript" id="native-fence">const greeting = "سلام";</div><div class="cm-line cm-markdown-table-row" id="native-table">| English | فارسی |</div>');
 });await waitPaint(page);
 check('native fenced code line stays LTR',(await getProbe(page,'native-fence')).direction==='ltr');
 check('native Markdown table syntax stays LTR',(await getProbe(page,'native-table')).direction==='ltr');
 await page.evaluate(()=>{
   const host=document.getElementById('dynamic');
   host.innerHTML='<div contenteditable="true" id="nested-editor"><h2 id="nested-title">ChatGPT برای نمایش متن فارسی بسیار مناسب است.</h2><ul><li><p id="nested-rtl">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</p></li><li><p id="nested-ltr">English paragraph stays LTR.</p></li></ul></div>';
 });await waitPaint(page);
 check('nested editor heading RTL',(await getProbe(page,'nested-title')).direction==='rtl');
 check('nested editor paragraph RTL',(await getProbe(page,'nested-rtl')).direction==='rtl');
 check('nested editor English paragraph LTR',(await getProbe(page,'nested-ltr')).direction==='ltr');
 await page.locator('#nested-editor').focus();await page.keyboard.press('Control+End');await page.keyboard.type('test edit');await waitPaint(page);
 await page.keyboard.press('Control+z');await waitPaint(page);
 check('CSS-only editor undo restores text',!(await page.locator('#nested-editor').textContent()).includes('test edit'));
 // Structure and text-only flex wrappers observed in the vendor iZe Question
 // component. Reading direction matters; left anchoring of a tight label
 // is accepted, and markers/arrows must keep their existing positions.
 const nativeChoiceBefore=await page.evaluate(languages=>{
   const section=document.createElement('section');section.id='native-choices';
   section.innerHTML='<style>.native-choice{display:flex;gap:12px;align-items:center;direction:ltr}.native-slot{display:flex;flex:1;min-width:0;flex-wrap:wrap;gap:8px}.native-group{display:inline-flex;min-width:0;align-items:center;gap:6px}.native-label{min-width:0;font-weight:500}</style>';
   languages.forEach(([language,text],i)=>{
     const row=document.createElement('div');row.id='native-choice-'+language;row.className='native-choice';row.setAttribute('role','radio');row.setAttribute('tabindex','0');
     const marker=document.createElement('span');marker.className='native-marker';marker.textContent=String(i+1);
     const slot=document.createElement('span');slot.className='native-slot';slot.id='native-slot-'+language;
     const group=document.createElement('span');group.className='native-group';
     const label=document.createElement('span');label.className='native-label';label.id='native-label-'+language;label.title=text+' 2 + 3 = 5';label.textContent=label.title;group.appendChild(label);slot.appendChild(group);
     const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.classList.add('native-arrow');arrow.setAttribute('width','16');arrow.setAttribute('height','16');
     row.append(marker,slot,arrow);row.onclick=()=>window.__choiceClicks=(window.__choiceClicks||0)+1;section.appendChild(row);
   });document.getElementById('dynamic').appendChild(section);
   return [...section.querySelectorAll('.native-marker,.native-arrow')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});
 },languages);await waitPaint(page);
 for(const [language] of languages){
   const layout=await page.evaluate(language=>{
     const label=document.getElementById('native-label-'+language),slot=document.getElementById('native-slot-'+language),l=label.getBoundingClientRect(),s=slot.getBoundingClientRect();
     return {direction:getComputedStyle(label).direction,rightGap:s.right-l.right,leftGap:l.left-s.left,text:label.textContent,title:label.title};
   },language);
   check(language+' native choice text direction',layout.direction===(language==='en'?'ltr':'rtl'),layout);
   check(language+' native choice logical text exact',layout.text===layout.title);
   const order=await literalOrder(page,'native-label-'+language,'2 + 3 = 5');check(language+' native choice arithmetic stays LTR',order.ltr,order);
 }
 const nativeChoiceAfter=await page.evaluate(()=>[...document.querySelectorAll('#native-choices .native-marker,#native-choices .native-arrow')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
 check('native choice markers and arrows do not move',JSON.stringify(nativeChoiceAfter)===JSON.stringify(nativeChoiceBefore),{before:nativeChoiceBefore,after:nativeChoiceAfter});
 await page.locator('#native-choice-fa').click();check('native choice click target preserved',await page.evaluate(()=>window.__choiceClicks)===1);
 await page.locator('#native-label-fa').evaluate(el=>{el.textContent='English option with ChatGPT and 2 + 3 = 5';el.title=el.textContent});await waitPaint(page);
 check('native choice changing to English restores LTR',await page.evaluate(()=>getComputedStyle(document.getElementById('native-label-fa')).direction==='ltr'));
 for(const [language,text] of languages){
   const direction=language==='en'?'ltr':'rtl';
   await page.locator('#question-text').evaluate((el,text)=>{el.textContent=text},text);
   await page.locator('#reply').fill(text);await page.locator('#text-input').fill(text);
   await page.locator('#text-editor').fill(text);await waitPaint(page);
   check(language+' question direction',(await getProbe(page,'question-text')).direction===direction);
   check(language+' reply direction',(await getProbe(page,'reply')).direction===direction);
   check(language+' text input direction',(await getProbe(page,'text-input')).direction===direction);
   check(language+' rich editor direction',(await getProbe(page,'text-editor')).direction===direction);
   await page.locator('#save-document').click();
   check(language+' saved fixture text exact',await page.evaluate(()=>window.__saved)===text);
 }
 await page.evaluate(()=>{
   document.getElementById('dynamic').innerHTML='<div contenteditable="true" id="large-editor">'+Array.from({length:3000},(_,i)=>'<p id="large-line-'+i+'">ChatGPT برای نمایش متن فارسی و انگلیسی بسیار مناسب است.</p>').join('')+'</div>';
   window.__largeEditorStart=performance.now();
 });
 await page.waitForFunction(()=>getComputedStyle(document.getElementById('large-line-2999')).textAlign==='right',null,{timeout:4000});
 const timing=await page.evaluate(()=>({ms:performance.now()-window.__largeEditorStart,pending:window.__CHATGPT_RTL_PATCH__.coverage().editorPending}));
 check('large editor completes staged direction within 4 seconds',timing.ms<4000,timing);
 check('large editor preserves model paragraphs',await page.locator('#large-editor p').count()===3000);
 check('no renderer errors',errors.length===0,errors);
 await page.locator('#question-text').evaluate((el,text)=>{el.textContent=text},question);
 await page.locator('#reply').fill(languages[0][1]);await waitPaint(page);
 if(outputDirectory){fs.mkdirSync(outputDirectory,{recursive:true});await page.locator('#question').screenshot({path:path.join(outputDirectory,baseline?'question-before.png':'question-after.png')});await page.locator('#plan').screenshot({path:path.join(outputDirectory,baseline?'plan-before.png':'plan-after.png')});}
 await context.close();return {scope:'Controlled surface fixtures, not real signed-in panels',baseline,checks,pass:checks.filter(x=>x.pass).length,total:checks.length,errors};
}
async function main(){
 const payload=fs.readFileSync(path.join(__dirname,'../payload.js'),'utf8'),out=path.join(__dirname,'../test-results');
 const browser=await chromium.launch({headless:true,...(process.env.RTL_CHROMIUM?{executablePath:process.env.RTL_CHROMIUM}:{})});
 try{const report=await runSurfaces(browser,{payload,outputDirectory:out,baseline:process.env.RTL_BASELINE==='1'});fs.writeFileSync(path.join(out,process.env.RTL_BASELINE==='1'?'surfaces-before.json':'surfaces-results.json'),JSON.stringify(report,null,2));console.log('App surfaces:',report.pass+'/'+report.total);for(const f of report.checks.filter(x=>!x.pass))console.log('FAIL',f.name,JSON.stringify(f.detail));if(report.pass!==report.total)process.exitCode=1;}finally{await browser.close();}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={surfaceHTML,runSurfaces,question,languages};
