#!/usr/bin/env node
'use strict';
/**
 * Pathle static-site release synchronizer.
 *
 * Source of truth: version.json. Never edit release labels / asset query
 * strings by hand. Run: node scripts/sync-release.cjs --write
 * CI:         node scripts/sync-release.cjs --check
 *
 * HTML/JS/CSS/image URLs are fingerprinted from their Git blob hashes:
 * unchanged files reuse the same browser cache across releases.
 * The Pages source remains the committed pathle-modular-dev branch.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const flag=process.argv[2]||'--check';
if(!['--check','--write'].includes(flag)){
  console.error('Usage: node scripts/sync-release.cjs --check|--write');
  process.exit(2);
}
const check=flag==='--check';
const manifest=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(manifest.version)||!['DEV','PROD'].includes(manifest.channel)){
  throw Error('Invalid version.json (expected version X.Y.Z and DEV/PROD channel)');
}
const ver=manifest.version,channel=manifest.channel;
const updates=new Map();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=p=>{
  const b=fs.readFileSync(path.join(root,p));
  return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
};
const stage=(p,s)=>updates.set(p,s);
const currentSource=read('js/version.js');
const old=/(?:const VERSION='([^']+)')/.exec(currentSource)?.[1];
if(!old||!(/^\d+\.\d+\.\d+$/.test(old)))throw Error('Missing installed version constant');
const escaped=v=>v.replaceAll('.','\\.');
const next=v=>{const n=v.split('.').map(Number);n[2]++;return n.join('.');};
const replaceCurrent=(s,from,to)=>s.replaceAll(from,to).replaceAll(escaped(from),escaped(to));
function matchAndReplace(src,re,replacement,name){
  if(!re.test(src))throw Error('Missing managed field: '+name);
  return src.replace(re,replacement);
}
// The browser reads a generated installed-version constant; the published
// manifest is the only source edited for new releases.
let versionJS=currentSource.replace(/const VERSION='[^']+';/,"const VERSION='"+ver+"';")
  .replace(/const CHANNEL='[^']+';/,"const CHANNEL='"+channel+"';");
if(versionJS===currentSource&&old!==ver)throw Error('Could not generate version module');
stage('js/version.js',versionJS);
const overrideHash={'js/version.js':(()=>{
  const b=Buffer.from(versionJS);
  return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
})()};
// The illustrated Coral Coast overview is loaded at runtime rather than
// from an HTML tag. Fingerprint that image too, so future art replacements
// receive new cache keys without any hand-edited JavaScript constants.
const worldArtFile='images/maps/water-world/coral-coast-overview.webp';
if(fs.existsSync(path.join(root,worldArtFile))){
  const p='js/treasure-map-art.js';
  const oldArt=read(p);
  if(!/const CORAL_COAST_ART_REV='[0-9a-f]{12}'/.test(oldArt))
    throw Error('Missing Coral Coast cache-revision marker');
  let newArt=oldArt.replace(/const CORAL_COAST_ART_REV='[0-9a-f]{12}'/,
    "const CORAL_COAST_ART_REV='"+sha(worldArtFile)+"'");
  // Six playable Coral Coast illustrations are real binary WebP assets,
  // independent from the separate Water World overview artwork.
  // Any changed section bumps this combined map revision automatically.
  const areaAssets=[
    'coral-coast-section-01-lagoon.webp',
    'coral-coast-section-02-gardens.webp',
    'coral-coast-section-03-seagrass.webp',
    'coral-coast-section-04-shipwreck.webp',
    'coral-coast-section-05-rocky.webp',
    'coral-coast-section-06-gate.webp'
  ];
  const mapRevision=crypto.createHash('sha1');
  for(const name of areaAssets){
    const file='images/maps/water-world/coral-coast/'+name;
    if(!fs.existsSync(path.join(root,file)))
      throw Error('Missing illustrated Coral Coast map section: '+file);
    mapRevision.update(sha(file));
  }
  if(!/const CORAL_COAST_SECTIONS_REV='[0-9a-f]{12}'/.test(newArt))
    throw Error('Missing Coral Coast section cache-revision marker');
  newArt=newArt.replace(/const CORAL_COAST_SECTIONS_REV='[0-9a-f]{12}'/,
    "const CORAL_COAST_SECTIONS_REV='"+mapRevision.digest('hex').slice(0,12)+"'");
  stage(p,newArt);
  const bytes=Buffer.from(newArt);
  overrideHash[p]=crypto.createHash('sha1')
    .update('blob '+bytes.length+'\0').update(bytes).digest('hex').slice(0,12);
}
const assetMap=new Map();
function assetVersion(p){
  if(!overrideHash[p]){
    const resolved=path.resolve(root,p);
    if(!resolved.startsWith(root+path.sep)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile()){
      throw Error('HTML references missing or unsafe local asset: '+p);
    }
  }
  const fingerprint=overrideHash[p]||sha(p);
  assetMap.set(p,fingerprint);
  return fingerprint;
}
function stampAssets(html){
  return html.replace(/\b(src|href)=(["'])([^"']+)\2/g,(whole,attr,q,value)=>{
    if(/^(?:https?:|\/\/|data:|#|mailto:)/i.test(value))return whole;
    const local=value.split('?')[0].split('#')[0];
    if(!/\.(?:css|js|webp|png|jpe?g|gif|svg|avif|woff2?)$/i.test(local))return whole;
    const fingerprint=assetVersion(local);
    return attr+'='+q+local+'?v='+fingerprint+q;
  });
}
let home=read('index.html');
home=home.replace(/(id="homeBuildBadge"[^>]*aria-label=")[^"]*"/,
  '$1Check for Pathle updates, installed development version '+ver+'"');
home=home.replace(/(id="homeBuildBadge"[^>]*>)[^<]*(<\/button>)/,
  '$1'+channel+' · v'+ver+'$2');
home=home.replace(/(id="updateLoadedVersion"[^>]*>)[^<]*(<\/p>)/,
  '$1Installed: '+channel+' · v'+ver+'$2');
home=home.replace(/(id="playTreasure" href=")treasure-hunt\.html(?:\?[^"]*)?"/,
  '$1treasure-hunt.html?v='+ver+'"');
home=stampAssets(home);
stage('index.html',home);
let hunt=read('treasure-hunt.html');
hunt=hunt.replace(/(class="th-back" href=")index\.html(?:\?[^"]*)?"/,
  '$1index.html?pathle-update='+ver+'"');
hunt=hunt.replace(/(href=")index\.html"/g,'$1index.html?pathle-update='+ver+'"');
hunt=stampAssets(hunt);
stage('treasure-hunt.html',hunt);
// Tests keep asserting the exact asset URLs, but their expected fingerprints
// are derived by the same deterministic release command, not edited manually.
function updateToken(s,p,value){
  const variants=[p,p.replaceAll('/','\\/').replaceAll('.','\\.')];
  for(const prefix of variants){
    let cursor=0;
    while(true){
      const found=s.indexOf(prefix,cursor);
      if(found<0)break;
      const start=found+prefix.length;
      const mark=s.startsWith('\\?v=',start)?'\\?v=':s.startsWith('?v=',start)?'?v=':null;
      if(!mark){cursor=start;continue;}
      const begin=start+mark.length,token=/^[a-zA-Z0-9.\\_-]+/.exec(s.slice(begin))?.[0];
      if(!token){cursor=begin;continue;}
      s=s.slice(0,begin)+value+s.slice(begin+token.length);
      cursor=begin+value.length;
    }
  }
  return s;
}
function updateVersionLink(s,p,queryKey){
  const variants=[p,p.replaceAll('.','\\.')];
  for(const prefix of variants){
    for(const divider of ['?','\\?']){
      const key=prefix+divider+queryKey+'=';
      let at=0;
      while((at=s.indexOf(key,at))!==-1){
        const start=at+key.length;
        const current=/^\d+(?:\\?\.\d+){2}/.exec(s.slice(start))?.[0];
        if(!current){at=start;continue;}
        const value=divider==='\\?'?escaped(ver):ver;
        s=s.slice(0,start)+value+s.slice(start+current.length);
        at=start+value.length;
      }
    }
  }
  return s;
}
const testFolder=path.join(root,'tests');
for(const name of fs.readdirSync(testFolder).filter(x=>x.endsWith('.test.cjs'))){
  const p='tests/'+name,source=read(p);
  let s=source;
  // Semantic current/next version scenarios belong only to the
  // version UI tests; keep tests of newer-version prompts meaningful.
  if(name==='version-label.test.cjs'){
    s=s.replaceAll(next(old),'__PATHLE_NEXT__')
       .replaceAll(escaped(next(old)),'__PATHLE_NEXT_ESC__');
    s=replaceCurrent(s,old,ver);
    s=s.replaceAll('__PATHLE_NEXT_ESC__',escaped(next(ver)))
       .replaceAll('__PATHLE_NEXT__',next(ver));
  }else if(name==='treasure-v2-entry.test.cjs'){
    s=replaceCurrent(s,old,ver);
  }
  for(const [asset,hash] of assetMap){
    s=updateToken(s,asset,hash);
  }
  s=updateVersionLink(s,'treasure-hunt.html','v');
  s=updateVersionLink(s,'index.html','pathle-update');
  if(s!==source)stage(p,s);
}
let docs=read('docs/VERSIONING.md');
docs=docs.replace(/\*\*DEV · v\d+\.\d+\.\d+\*\*/,'**'+channel+' · v'+ver+'**');
stage('docs/VERSIONING.md',docs);
let stale=[];
for(const [p,out] of updates){
  const cur=read(p);
  if(cur===out)continue;
  stale.push(p);
  if(!check)fs.writeFileSync(path.join(root,p),out);
}
if(stale.length&&check){
  console.error('Release output out of sync with version.json ('+ver+'):');
  for(const p of stale)console.error('  '+p);
  console.error('Run: node scripts/sync-release.cjs --write, then commit generated files.');
  process.exitCode=1;
}else{
  console.log((check?'Verified':'Synchronized')+' Pathle '+channel+' v'+ver+
    ' ('+stale.length+' modified files, '+assetMap.size+' fingerprinted assets).');
}
