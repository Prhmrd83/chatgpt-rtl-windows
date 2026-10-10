'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright-core');
const {inside,safeRemove}=require('./store.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));

async function smoke(app,root,id,options={}) {
  if(process.platform!=='win32')throw Error('Native launch verification is Windows-only');
  const profile=inside(root,'transactions/smoke-'+id);
  if(fs.existsSync(profile))throw Error('Smoke profile must be new');
  fs.mkdirSync(profile,{recursive:true});
  const exe=['ChatGPT.exe','Codex.exe'].map(n=>path.join(app,n)).find(p=>fs.existsSync(p));
  if(!exe)throw Error('App executable not found');
  const helper=path.join(__dirname,'../scripts/smoke-process.ps1');
  const ps=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
  const start=spawnSync(ps,['-NoProfile','-ExecutionPolicy','Bypass','-File',helper,'-AppExe',exe,'-Profile',profile],{encoding:'utf8',windowsHide:true,timeout:15000});
  if(start.status!==0)throw Error('Could not start isolated launch check: '+start.stderr);
  let browser;
  try {
    const portFile=path.join(profile,'DevToolsActivePort');
    for(let n=0;n<60&&!fs.existsSync(portFile);n++)await delay(500);
    if(!fs.existsSync(portFile))throw Error('App did not establish an isolated debugging profile');
    const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
    if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid isolated debugging port');
    browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:10000});
    let ready=null;
    for(let n=0;n<50&&!ready;n++) {
      for(const ctx of browser.contexts())for(const page of ctx.pages()) {
        try {
          const info=await page.evaluate(()=>({ready:!!(document.body&&document.body.children.length&&window.__CHATGPT_RTL_PATCH__),version:window.__CHATGPT_RTL_PATCH__?.version,location:location.protocol}));
          if(info.ready){ready=info;break;}
        }catch{}
      }
      if(!ready)await delay(400);
    }
    if(!ready)throw Error('Renderer did not initialize the RTL payload');
    // Keep observing long enough to catch a startup abort. This is a fresh
    // renderer profile; the native platform may still share account state.
    // No existing profile or authentication files are copied by this check.
    await delay(3000);
    if(!browser.isConnected())throw Error('App exited during its launch check');
    const inspection=options.inspect?await options.inspect(browser):undefined;
    return {isolatedProfile:true,payload:ready.version,passed:true,...(inspection?{inspection}: {})};
  } finally {
    if(browser)try{await browser.close();}catch{}
    // Stop only processes whose command line contains this exact unique
    // profile and whose path belongs to this candidate. Never kill by name.
    spawnSync(ps,['-NoProfile','-ExecutionPolicy','Bypass','-File',helper,'-AppExe',exe,'-Profile',profile,'-Stop'],{encoding:'utf8',windowsHide:true,timeout:15000});
    try{safeRemove(root,'transactions/smoke-'+id);}catch{}
  }
}
module.exports={smoke};
