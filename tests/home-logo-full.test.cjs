'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

test('v1.5.7 uses a verified complete padded logo file rather than tight crop',()=>{
 const buf=fs.readFileSync(path.join(__dirname,'../images/pathle-logo-menu-full.webp'));
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.equal(buf.toString('ascii',8,12),'WEBP');
 assert.equal(buf.toString('ascii',12,16),'VP8X');
 assert.equal(buf.readUIntLE(24,3)+1,574);
 assert.equal(buf.readUIntLE(27,3)+1,326);
 assert.ok(buf.includes(Buffer.from('ALPH')),'Transparent top and side margins must be retained');
 // Visual-inspected asset: restores the entire letter l from original art,
 // and retains a transparent 26px top / 18px bottom border.
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([
   Buffer.from('blob '+buf.length+'\0'),buf
 ])).digest('hex'),'e203a217d180990d608b1c52eb78a8329f88bb63');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../css/home-reef.css'),'utf8');
 assert.match(html,/images\/pathle-logo-menu-full\.webp\?v=1\.5\.7/);
 assert.match(html,/width="574" height="326"/);
 assert.match(css,/aspect-ratio:574\/326/);
 assert.match(css,/overflow:visible !important/);
});
