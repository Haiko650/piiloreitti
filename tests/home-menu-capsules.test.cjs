'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

const IDs=['playDaily','playTreasure','playPractice','openHideout'];

test('four approved home-menu actions follow the same DOM and visual order',()=>{
  const html=read('index.html');
  const positions=IDs.map(id=>html.indexOf('id="'+id+'"'));
  assert.ok(positions.every((pos,i)=>pos>0&&(i===0||pos>positions[i-1])));
  for(const id of IDs){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  }
  assert.match(html,/<a class="menuButton menuTreasure" id="playTreasure" href="treasure-hunt\.html">/);
  assert.doesNotMatch(html,/css\/treasure-home\.css/);
});

test('a single dedicated stylesheet owns the main-menu button visuals',()=>{
  const html=read('index.html');
  const legacy=read('css/styles.css');
  const capsules=read('css/menu-capsules.css');
  assert.match(html,/css\/menu-capsules\.css\?v=20261106-clean2/);
  assert.doesNotMatch(legacy,/\.(?:menuButton|menuDaily|menuTreasure|menuPractice|menuHideout|menuIcon)\b|#(?:playDaily|playTreasure|playPractice|openHideout)\b/);
  for(const id of IDs){
    assert.ok(capsules.includes('#'+id+'{'),'Missing '+id+' styling');
  }
  assert.match(capsules,/@media\(max-height:620px\)/);
  assert.match(capsules,/@media\(max-height:520px\)/);
  assert.match(capsules,/#welcomeScreen #playDaily:disabled/);
});

test('menu progression remains available without altering gameplay files',()=>{
  const html=read('index.html');
  for(const id of ['adventureCard','homeWeekDots','journeyQuick','homeGuideBtn','homeSettings']){
    assert.ok(html.includes('id="'+id+'"'),id+' missing');
  }
  assert.match(html,/id="dailyButtonHint"/);
  assert.match(read('css/menu-capsules.css'),/text-overflow:ellipsis!important;/);
});
