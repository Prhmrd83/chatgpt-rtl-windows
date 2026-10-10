'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {compare,fixture,getProbe,waitPaint,literalOrder}=require('./fixture.cjs');
const payload=fs.readFileSync(path.join(__dirname,'../payload.js'),'utf8');
const out=path.join(__dirname,'../test-results');
fs.mkdirSync(out,{recursive:true});

(async()=>{
  const executablePath=process.env.RTL_CHROMIUM;
  const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{} )});
  const results=[],extended=[];
  try {
    for(const mode of process.env.RTL_STYLE_DIR?['neutral-fixture','installed-styles']:['neutral-fixture']) {
      const result=await compare({id:'chatgpt-rtl-windows',repository:'Prhmrd83/chatgpt-rtl-windows',js:payload},mode,browser);
      results.push(result);
      console.log(`${mode}: ${result.pass}/${result.total}`);
      for(const fail of result.checks.filter(x=>!x.pass))console.error(fail.name,JSON.stringify(fail.detail));
    }
    const context=await browser.newContext();
    await context.route('**/*',r=>r.abort());
    const page=await context.newPage();
    await page.setContent(fixture('neutral-fixture'));
    await page.addScriptTag({content:payload});await waitPaint(page);
    const check=(name,pass)=>extended.push({name,pass});
    for(const [lang,text] of [['Arabic','ChatGPT يساعدنا في كتابة النص العربي والإنجليزي بشكل صحيح.'],['Hebrew','ChatGPT עוזר לנו לכתוב ולבדוק טקסט בעברית ובאנגלית בצורה נכונה.']]) {
      await page.locator('#live').evaluate((el,t)=>{el.textContent=t;},text);
      await waitPaint(page);check(lang+' English-first response',(await getProbe(page,'live')).side==='right');
      await page.locator('#composer').fill(text);await waitPaint(page);
      check(lang+' English-first editor',(await getProbe(page,'input-fa')).side==='right');
    }
    await page.locator('#composer').fill('ChatGPT برای نوشتن متن فارسی و انگلیسی بسیار مناسب است.');await waitPaint(page);
    check('Persian English-first editor',(await getProbe(page,'input-fa')).side==='right');
    await page.locator('#textarea').fill('ChatGPT برای نوشتن متن فارسی و انگلیسی بسیار مناسب است.');await waitPaint(page);
    check('textarea English-first input',(await getProbe(page,'textarea')).direction==='rtl');
    await page.locator('#composer').fill('A'.repeat(25));await waitPaint(page);
    check('editor returns to English',(await getProbe(page,'composer')).direction==='ltr');
    await page.evaluate(()=>{
      const el=document.getElementById('live');el.textContent='متن فارسی ChatGPT در متن فارسی';
      const text=el.firstChild;const r=document.createRange();r.setStart(text,0);r.setEnd(text,'متن فارسی '.length);getSelection().removeAllRanges();getSelection().addRange(r);
    });await waitPaint(page);
    check('selection survives inline isolation',await page.evaluate(()=>getSelection().toString()==='متن فارسی '));
    const once=await page.locator('#live').innerHTML();
    await page.evaluate(()=>window.__RT_AI_CODEX_RTL_INFO__.rescan());await waitPaint(page);
    check('rescan idempotent',once===await page.locator('#live').innerHTML());
    check('no dir or lang added',await page.evaluate(()=>!document.querySelector('#messages [dir],#messages [lang]')));
    check('number-only text stays LTR',await page.evaluate(()=>window.__CHATGPT_RTL_PATCH__.detectTextDir('۱۴۰۵/۰۷/۱۷')==='ltr'));
    await page.evaluate(()=>{
      const el=document.getElementById('live');el.textContent='متن فارسی با ChatGPT';window.__modelText=el.firstChild;
    });await waitPaint(page);
    check('framework Text node stays connected',await page.evaluate(()=>window.__modelText.isConnected));
    await page.evaluate(()=>{window.__modelText.data='متن فارسی با ChatGPT و نتیجهٔ 2 + 3 = 5';});await waitPaint(page);
    check('framework full-text update has no duplicate tokens',await page.locator('#live').textContent()==='متن فارسی با ChatGPT و نتیجهٔ 2 + 3 = 5');
    check('streamed arithmetic stays LTR',(await literalOrder(page,'live','2 + 3 = 5')).ltr);
    await page.evaluate(()=>{const node=document.createTextNode('English replacement.');window.__modelText.replaceWith(node);});await waitPaint(page);
    check('framework Text-node replacement removes owned spans',await page.locator('#live').textContent()==='English replacement.');
    await context.close();
  } finally {await browser.close();}
  const report={generated:new Date().toISOString(),browser:browser.version(),scope:'Isolated browser fixtures, not signed-in ChatGPT sessions',appVersion:process.env.RTL_APP_VERSION||null,results,extended};
  fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify(report,null,2));
  console.log('Extended checks:',extended.filter(x=>x.pass).length+'/'+extended.length);
  for(const fail of extended.filter(x=>!x.pass))console.error(fail.name);
  if(results.some(x=>x.pass!==29)||extended.some(x=>!x.pass))process.exitCode=1;
})().catch(err=>{console.error(err);process.exitCode=1;});
