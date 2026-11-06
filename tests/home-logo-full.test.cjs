'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=path.join(__dirname,'..');

test('the newly supplied Pathle logo replaces both obsolete menu logos',()=>{
 const file=path.join(base,'images/pathle-logo.webp');
 const b=fs.readFileSync(file);
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.equal(b.toString('ascii',12,16),'VP8X');
 assert.equal(b.readUIntLE(24,3)+1,1807);
 assert.equal(b.readUIntLE(27,3)+1,696);
 assert.ok(b.includes(Buffer.from('ALPH')),'The menu logo should have transparency');
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([
  Buffer.from('blob '+b.length+'\0'),b
 ])).digest('hex'),'9721ef72970c9ca4b83ed20f7f7b821d8d5ea1b8');
 for(const old of ['images/pathle-logo-menu.webp','images/pathle-logo-menu-full.webp']){
  assert.equal(fs.existsSync(path.join(base,old)),false,'Old logo still exists: '+old);
 }
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(base,'css/home-reef.css'),'utf8');
 assert.match(html,/images\/pathle-logo\.webp\?v=1\.5\.8/);
 assert.match(html,/width="1807" height="696"/);
 assert.doesNotMatch(html,/pathle-logo-menu(?:-full)?\.webp/);
 assert.match(css,/aspect-ratio:1807\/696/);
 assert.match(css,/overflow:visible !important/);
});
