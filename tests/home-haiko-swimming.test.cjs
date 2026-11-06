'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('home exclusively uses swimming Haiko, other sprites remain unchanged',()=>{
 const html=read('index.html');
 const home=html.match(/<div[^>]+class="haiko-avatar restored-haiko home-haiko"[^>]*>[\s\S]*?<\/div>/);
 assert.ok(home);
 assert.match(home[0],/class="home-swimming-art"/);
 assert.match(home[0],/src="images\/haiko-swimming-menu\.webp\?v=1\.5\.4"/);
 assert.match(home[0],/swimming to the right/);
 assert.match(html,/class="haiko-avatar restored-haiko hideout-haiko"/);
 assert.match(html,/class="haiko-avatar restored-haiko brand-haiko"/);
});
test('menu shark image is independent of coral reef and styles avoid clipping',()=>{
 const css=read('css/home-reef.css');
 assert.match(css,/aspect-ratio:840\/430 !important/);
 assert.match(css,/\.home-haiko \.home-swimming-art\{/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/\.home-haiko \.haiko-shades,/);
 assert.match(css,/animation:haikoHomeBob/);
 assert.match(css,/home-reef-background\.webp/);
 const html=read('index.html');
 assert.match(html,/css\/home-reef\.css\?v=20261106-logo4/);
});
test('new image is a valid transparent WebP in the repository',()=>{
 const data=fs.readFileSync(path.join(__dirname,'..','images/haiko-swimming-menu.webp'));
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.ok(data.length>20000);
});
