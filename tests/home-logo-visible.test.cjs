'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('the visible Pathle logo overrides old display:none !important with same specificity',()=>{
  const old=read('css/styles.css');
  const home=read('css/home-reef.css');
  const html=read('index.html');
  assert.match(old,/#welcomeScreen \.homeBrand,\s*#welcomeScreen \.homeStage\s*\{display:none !important;\}/);
  const rule=home.match(/#welcomeScreen \.homeBrand\s*\{([^}]+)\}/);
  assert.ok(rule,'No home brand visibility rule');
  assert.match(rule[1],/display\s*:\s*flex\s*!important\s*;/);
  assert.match(rule[1],/flex-direction\s*:\s*column\s*;/);
  assert.match(rule[1],/align-items\s*:\s*center\s*;/);
  assert.ok(html.indexOf('css/home-reef.css')>html.indexOf('css/styles.css'),
    'New rule must load after old hidden brand rule');
  assert.match(html,/css\/home-reef\.css\?v=20261106-logo3/);
  assert.match(html,/<img class="pathleHomeLogoImage"[^>]+src="images\/pathle-logo-menu-full\.webp\?v=1\.5\.7"/);
});
