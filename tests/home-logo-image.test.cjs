'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('the welcome screen displays the separate illustrated Pathle logo, not text styling',()=>{
  const html=read('index.html');
  const match=html.match(/<div class="homeBrand">([\s\S]*?)<\/div>/);
  assert.ok(match,'Welcome screen brand not found');
  assert.match(match[1],/<h1 class="pathleHomeLogoHeading">/);
  assert.match(match[1],/<img class="pathleHomeLogoImage" src="images\/pathle-logo\.webp\?v=9721ef72970c" alt="Pathle"/);
  assert.doesNotMatch(match[1],/pathleLogoText|pathleLogoWave/);
  assert.doesNotMatch(match[1],/OCEAN JOURNEY|class="tag"/,
    "The former logo subtitle must not appear on the home screen");
  assert.equal((html.match(/class="pathleHomeLogoImage"/g)||[]).length,1);
});
test('the logo has transparency and lives in its own replaceable file',()=>{
  const b=fs.readFileSync(path.join(__dirname,'..','images/pathle-logo.webp'));
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.ok(b.includes(Buffer.from('ALPH')),'Logo must keep transparent background');
  assert.ok(b.length>50000&&b.length<400000);
});
test('logo is responsive and does not replace background or swimming Haiko',()=>{
  const css=read('css/home-reef.css'),html=read('index.html');
  assert.match(css,/#welcomeScreen \.homeBrand \.pathleHomeLogoImage\{/);
  assert.match(css,/#welcomeScreen \.homeBrand \.pathleHomeLogoHeading\{/);
  assert.match(css,/aspect-ratio:1807\/696/);
  assert.match(css,/object-fit:contain/);
  assert.match(css,/@media\(max-height:680px\)/);
  assert.match(html,/css\/home-reef\.css\?v=28c5eadb8991/);
  assert.match(html,/home-swimming-art" src="images\/haiko-swimming-menu\.webp\?v=23b8cf3245ec"/);
  assert.match(css,/home-reef-background\.webp/);
});
