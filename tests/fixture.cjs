// Original 29-check comparison criteria, preserved from the October 7 research.
const fs = require('node:fs');
const path = require('node:path');
const OUT = path.join(__dirname, '..', 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const read = file => fs.readFileSync(file, 'utf8');
const baseCss = `
html{background:#f7f8fa;color:#18202b} body{font-family:Arial,sans-serif;margin:0;direction:ltr}
aside{position:fixed;left:0;top:0;width:150px;height:100vh;background:#e8edf4;padding:16px;box-sizing:border-box}
main{margin-left:170px;width:860px;padding:20px;box-sizing:border-box}
p,li,h3,blockquote,td,th{font-size:18px;line-height:1.8;margin:10px 0;text-align:start}
p{min-height:32px} ul,ol{padding-inline-start:32px} blockquote{border-inline-start:4px solid #9caac1;padding-inline-start:20px}
pre{padding:14px;background:#eaf0f7;white-space:pre;font-size:16px} code{font-family:Consolas,monospace}
.katex{display:inline-flex} .katex>span{padding:0 3px} textarea,[contenteditable]{width:100%;padding:12px;border:1px solid #8d9bb0;background:white;box-sizing:border-box}
.probe-control{display:inline-flex;gap:6px}.probe-control[dir=rtl], [dir=rtl] .probe-control{flex-direction:row-reverse}
bdi, [data-codex-ltr-run]{color:inherit} table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}
`;
const assetDir = process.env.RTL_STYLE_DIR;
const assetFiles = assetDir ? fs.readdirSync(assetDir) : [];
const mdFile = assetFiles.find(x => /^markdown-/.test(x));
const mdCss = mdFile ? read(path.join(assetDir, mdFile)) : '';
const actualMdClass = mdCss.match(/_MarkdownRoot_[\w-]+/)?.[0] || '_MarkdownRoot_fixture';
const installedCss = assetFiles.filter(x => /^(app-shared|app-primary|markdown|chatgpt-conversation-turn-content|katex)-/.test(x)).map(x => read(path.join(assetDir, x))).join('\n');
function fixture(mode) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Isolated RTL comparison</title><style>${mode === 'installed-styles' ? installedCss : ''}\n${baseCss}</style></head><body>
  <aside class="app-shell-left-panel"><nav><div id="chrome-probe" class="probe-control"><button>Chat</button><button>Work</button><button>Codex</button></div><p>گفتگوها</p></nav></aside>
  <main><h2>${mode}: Persian / English rendering test</h2><div class="thread-scroll-container"><article data-testid="conversation-turn-1"><div data-message-author-role="assistant"><div class="${actualMdClass} markdown prose" id="messages">
  <p id="fa">این یک جملهٔ فارسی برای آزمایش نمایش درست است.</p>
  <p id="mixed">من برای نوشتن کد از ChatGPT و Visual Studio Code استفاده می‌کنم.</p>
  <p id="latin-first">ChatGPT برای نوشتن و بررسی متن فارسی و انگلیسی به ما کمک می‌کند.</p>
  <p id="english">This English paragraph should remain left aligned.</p>
  <p id="english-mixed">The Persian greeting سلام means hello in English.</p>
  <p id="inline">برای نصب، دستور <code id="inline-code">npm install package@1.2.3</code> را اجرا کنید.</p>
  <p id="math">نتیجهٔ محاسبه 2 + 3 = 5 درست است.</p>
  <p id="link">نشانی <a id="url" href="https://example.com/a?x=1&y=2">https://example.com/a?x=1&amp;y=2</a> را باز کنید.</p>
  <p id="numbers">نسخهٔ 1.2.3 در تاریخ 2026-10-07 منتشر شد.</p>
  <p id="parens">برای این کار (Google Chrome) مناسب است؛ درست است؟</p>
  <p id="katex-p">معادله <span class="katex" id="katex"><span>x</span><span>+</span><span>2</span><span>=</span><span>5</span></span> را حل کنید.</p>
  <h3 id="heading">راهنمای نصب ChatGPT</h3><ul id="list"><li id="list-fa">مرحلهٔ اول: نصب Node.js</li><li>مرحلهٔ دوم: اجرای برنامه</li></ul>
  <blockquote id="quote">نقل قول فارسی همراه با English words</blockquote>
  <pre id="pre"><code id="block-code" class="language-js">const message = "سلام";\nconsole.log(message);</code></pre>
  <table><thead><tr><th>ویژگی</th><th>ChatGPT</th></tr></thead><tbody><tr><td id="table-fa">نسخهٔ فارسی</td><td id="table-en">English</td></tr></tbody></table>
  <div data-message-author-role="user"><div id="user-div" class="whitespace-pre-wrap">این پیام فارسی همراه با OpenAI است.</div></div>
  <p id="live">English text</p><p id="same-length">ChatGPT این یک جمله فارسی بسیار واضح است.</p>
  <p id="control-parent">متن فارسی <button class="probe-control" id="embedded-control"><span id="control-a">A</span><span id="control-b">B</span></button></p>
  </div></div></article></div>
  <h3>Composer</h3><div id="composer" contenteditable="true" role="textbox" data-lexical-editor="true" class="ProseMirror"><p id="input-fa">من از ChatGPT استفاده می‌کنم.</p></div><textarea id="textarea">من از ChatGPT استفاده می‌کنم.</textarea>
  </main></body></html>`;
}
async function getProbe(page, id) {
  return await page.evaluate(id => {
    const el = document.getElementById(id);
    const box = el.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el);
    const rect = range.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const dl = Math.abs(rect.left - box.left - parseFloat(cs.paddingLeft));
    const dr = Math.abs(box.right - rect.right - parseFloat(cs.paddingRight));
    return {direction:cs.direction,bidi:cs.unicodeBidi,align:cs.textAlign,side:dr < dl ? 'right':'left',left:rect.left,right:rect.right,text:el.textContent};
  }, id);
}
async function waitPaint(page) {
  await page.waitForTimeout(700);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
async function literalOrder(page,id,literal) {
 return await page.evaluate(({id,literal})=>{
  const el=document.getElementById(id);const start=el.textContent.indexOf(literal);const end=start+literal.length;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n,offset=0;const positions=[];
  while(n=walker.nextNode()) {for(let i=0;i<n.length;i++) {const at=offset+i;if(at>=start && at<end){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);positions.push({char:n.data[i],x:r.getBoundingClientRect().x});}}offset+=n.length;}
  return {found:start>=0,positions,ltr:start>=0 && positions.every((p,i)=>i===0 || p.x>positions[i-1].x)};
 },{id,literal});
}
async function compare(candidate, mode, browser) {
  const context = await browser.newContext({viewport:{width:1200,height:1000}});
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setContent(fixture(mode));
  await page.evaluate(() => {
    window.chrome = {runtime:{getURL:x=>'data:application/octet-stream;base64,',lastError:null},storage:{sync:{get:(defaults,cb)=>cb(defaults)},onChanged:{addListener:()=>{}}}};
    window.__initialMessagesText = document.getElementById('messages').textContent;
    window.__initialComposerHTML = document.getElementById('composer').innerHTML;
    const control = document.getElementById('embedded-control');
    window.__controlBefore = [...control.children].map(x=>x.getBoundingClientRect().x);
    window.__sidebarBefore = document.getElementById('chrome-probe').getBoundingClientRect().toJSON();
  });
  if (candidate.css) {
    await page.evaluate(css => {window.__CODEX_RTL_STYLE__=css;}, candidate.css);
    if (candidate.id !== 'pawnsmaster') await page.addStyleTag({content:candidate.css});
  }
  await page.addScriptTag({content:candidate.js});
  await waitPaint(page);
  const checks=[];
  const check=(name,pass,detail)=>checks.push({name,pass,detail});
  for (const [id,side] of [['fa','right'],['mixed','right'],['latin-first','right'],['english','left'],['english-mixed','left'],['inline','right'],['heading','right'],['quote','right'],['user-div','right'],['input-fa','right']]) {
    const result=await getProbe(page,id); check(id+' alignment',result.side===side,result);
  }
  for (const id of ['inline-code','pre','block-code','katex']) {
    const result=await getProbe(page,id); check(id+' LTR isolation',result.direction==='ltr' && ['isolate','isolate-override','embed'].includes(result.bidi),result);
  }
  const list=await getProbe(page,'list'); check('RTL list markers',list.direction==='rtl',list);
  const codePoints=await page.evaluate(() => {
    const el=document.getElementById('math'); const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let n; const rects=[];
    while(n=walker.nextNode()) {for(let i=0;i<n.length;i++) {if(/[235]/.test(n.data[i])) {const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);rects.push({char:n.data[i],x:r.getBoundingClientRect().x});}}}
    return rects;
  });
  check('arithmetic operand order',codePoints.length===3 && codePoints[0].x<codePoints[1].x && codePoints[1].x<codePoints[2].x,codePoints);
  for(const [id,literal,label] of [['numbers','2026-10-07','ISO date order'],['numbers','1.2.3','version number order'],['url','https://example.com/a?x=1&y=2','URL character order']]) {
   const order=await literalOrder(page,id,literal);check(label,order.ltr,order);
  }
  const staticState=await page.evaluate(() => ({textPreserved:document.getElementById('messages').textContent===window.__initialMessagesText,
    composerUnchanged:document.getElementById('composer').innerHTML===window.__initialComposerHTML,
    controlPositions:[...document.getElementById('embedded-control').children].map(x=>x.getBoundingClientRect().x),
    controlBefore:window.__controlBefore,sidebarAfter:document.getElementById('chrome-probe').getBoundingClientRect().toJSON(),sidebarBefore:window.__sidebarBefore}));
  check('message text preservation',staticState.textPreserved,staticState.textPreserved);
  check('editor child DOM preservation',staticState.composerUnchanged,staticState.composerUnchanged);
  check('embedded controls keep LTR order',staticState.controlPositions[0]<staticState.controlPositions[1],staticState.controlPositions);
  check('sidebar position unchanged',JSON.stringify(staticState.sidebarBefore)===JSON.stringify(staticState.sidebarAfter),staticState.sidebarAfter);
  await page.screenshot({path:path.join(OUT,candidate.id+'-'+mode+'.png'),fullPage:true});
  await page.evaluate(() => {document.getElementById('live').firstChild.data+=' این جملهٔ فارسی برای آزمایش متن زنده و جهت نوشته است.';});
  await waitPaint(page);
  const live=await getProbe(page,'live'); check('streaming characterData update',live.side==='right',live);
  await page.evaluate(() => {document.getElementById('live').textContent='Completely English again, left aligned.';});
  await waitPaint(page);
  const reverted=await getProbe(page,'live'); check('edited content returns to LTR',reverted.side==='left',reverted);
  await page.evaluate(() => {const el=document.getElementById('same-length'); const count=el.textContent.length;el.textContent='A'.repeat(count);});
  await waitPaint(page);
  const same=await getProbe(page,'same-length'); check('same-length edit returns to LTR',same.side==='left',same);
  await page.locator('#composer').fill('من با ChatGPT متن فارسی جدید می‌نویسم.');
  await waitPaint(page);
  const typing=await page.locator('#composer').textContent(); check('editable typing survives',typing==='من با ChatGPT متن فارسی جدید می‌نویسم.',typing);
  const elapsed=await page.evaluate(async () => {
    const p=document.createElement('p');document.getElementById('messages').appendChild(p);const start=performance.now();
    for(let i=0;i<400;i++){p.textContent+='واژه ';void p.offsetHeight;}
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-start;
  });
  check('400 token append completes under 3 seconds',elapsed<3000,Math.round(elapsed));
  check('no script errors',errors.length===0,errors);
  await context.close();
  return {id:candidate.id,repository:candidate.repository,mode,checks,pass:checks.filter(x=>x.pass).length,total:checks.length};
}

module.exports={compare,fixture,getProbe,waitPaint,literalOrder};
