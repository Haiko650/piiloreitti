'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('ocean Settings dialog has its own glossy styling and does not replace other modals',()=>{
  const html=read('index.html');
  const css=read('css/settings-ocean.css');
  const modalStart=html.indexOf('id="settingsModal"');
  const dialogEnd=html.indexOf('</section>',modalStart);
  assert.ok(modalStart>=0&&dialogEnd>modalStart,'Settings dialog must exist');
  const dialog=html.slice(modalStart,dialogEnd);
  assert.match(dialog,/class="modalCard oceanSettingsCard"/);
  assert.match(dialog,/aria-modal="true"/);
  assert.match(dialog,/aria-labelledby="settingsTitle"/);
  assert.match(css,/#settingsModal \.oceanSettingsCard\{/);
  assert.match(css,/#settingsModal \.soundControl\.oceanSettingsOption\{/);
  assert.match(css,/#settingsModal #howPlaySettings\.guideSettingsButton\{/);
  assert.match(css,/#settingsModal #doneSettings\.primary\{/);
  const menu=html.indexOf('css/menu-capsules.css');
  const settings=html.indexOf('css/settings-ocean.css?v=5b65398f32ec');
  assert.ok(settings>menu,'Settings skin must load after menu skin');
});

test('sound/music/sea controls keep stable IDs and accessible label associations',()=>{
  const html=read('index.html');
  const dialog=html.slice(html.indexOf('id="settingsModal"'),html.indexOf('</section>',html.indexOf('id="settingsModal"')));
  for(const id of ['soundSwitch','musicSwitch','ambientSwitch']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1, 'Duplicate '+id);
    assert.match(dialog,new RegExp('<label[^>]*for="'+id+'"[^>]*>'));
    assert.match(dialog,new RegExp('<input[^>]*id="'+id+'"[^>]*type="checkbox"'));
  }
  for(const id of ['closeSettings','doneSettings','howPlaySettings']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1, 'Duplicate '+id);
    assert.match(dialog,new RegExp('id="'+id+'"'));
  }
});

test('previous Settings events and saved audio preference updates remain connected',()=>{
  const game=read('js/game.js');
  const css=read('css/settings-ocean.css');
  assert.match(game,/el\('homeSettings'\)\.onclick=settingsOpen/);
  assert.match(game,/el\('gameSettings'\)\.onclick=settingsOpen/);
  assert.match(game,/el\('closeSettings'\)\.onclick=settingsClose/);
  assert.match(game,/el\('doneSettings'\)\.onclick=settingsClose/);
  assert.match(game,/el\('howPlaySettings'\)\.onclick=/);
  for(const [id,key] of [['soundSwitch','sound'],['musicSwitch','music'],['ambientSwitch','ambient']]){
    assert.ok(game.includes("el('"+id+"').onchange="),id+' handler missing');
    assert.ok(game.includes("recordPreferenceChange('settings','"+key+"'"),key+' save missing');
  }
  assert.match(css,/\.switch input:focus-visible \+ \.switchKnob/);
  assert.match(css,/@media\(max-height:660px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
