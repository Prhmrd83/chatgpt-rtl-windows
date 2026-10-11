'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(root).filter(name=>name.endsWith('.md'));
function collect(directory) {
  for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true})) {
    const name=directory+'/'+entry.name;
    if(entry.isDirectory())collect(name);
    else if(entry.isFile()&&name.endsWith('.md'))files.push(name);
  }
}
for(const directory of ['docs','assets','.github'])if(fs.existsSync(path.join(root,directory)))collect(directory);
const anchors=text=>{
  const seen=new Map(),result=new Set();
  for(const match of text.replace(/```[\s\S]*?```/g,'').matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base=match[1].toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu,'').replace(/ /g,'-');
    const count=seen.get(base)||0;seen.set(base,count+1);result.add(base+(count?'-'+count:''));
  }
  return result;
};
let links=0;const errors=[];
for(const name of files) {
  const file=path.join(root,name),text=fs.readFileSync(file,'utf8').replace(/```[\s\S]*?```/g,'');
  for(const match of text.matchAll(/\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const url=match[1];if(/^[a-z]+:/i.test(url))continue;
    links++;
    const [relative,fragment]=url.split('#'),target=path.resolve(path.dirname(file),decodeURIComponent(relative||path.basename(file)));
    if(!fs.existsSync(target)){errors.push(name+': missing '+url);continue;}
    if(fragment&&target.endsWith('.md')&&!anchors(fs.readFileSync(target,'utf8')).has(decodeURIComponent(fragment)))errors.push(name+': missing anchor '+url);
  }
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
if(pkg.version!==lock.version||pkg.version!==lock.packages[''].version)errors.push('Package/lock versions differ');
if(pkg.license!=='MIT'||!fs.readFileSync(path.join(root,'LICENSE'),'utf8').startsWith('MIT License'))errors.push('License metadata differs');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Checked ${files.length} Markdown files, ${links} local links/anchors, package versions, and license metadata.`);
