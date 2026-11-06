'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Water World presentation uses a dedicated final-loaded ocean skin',()=>{
 const html=read('treasure-hunt.html');
 const ui=read('css/treasure-world-ui.css');
 const world=html.slice(html.indexOf('id="thV2World"'),html.indexOf('id="thV2Area"'));
 assert.ok(html.indexOf('css/treasure-world-ui.css?v=20261106-waterworld1')>
           html.indexOf('css/treasure-world-v2.css?v=th6a3d'));
 assert.match(world,/class="th-v2-world-hero"/);
 assert.match(world,/class="th-v2-world-brand"/);
 assert.match(world,/class="th-v2-world-emblem"/);
 assert.match(world,/id="thV2WorldTitle"/);
 assert.match(world,/id="thV2WorldStatus"/);
 assert.match(world,/id="thV2WorldBack"/);
 assert.match(world,/class="th-v2-world-toolbar-label"/);
 assert.match(ui,/#thV2World \.th-v2-world-hero\{/);
 assert.match(ui,/#thV2World \.th-v2-world-controls\{/);
 assert.match(ui,/#thV2World #thV2WorldBack\.th-v2-map-secondary\{/);
 assert.match(ui,/@media\(max-width:360px\)/);
 assert.match(ui,/@media\(max-height:650px\)/);
});

test('new Water World UI does not touch map geometry or map artwork assets',()=>{
 const html=read('treasure-hunt.html');
 const ui=read('css/treasure-world-ui.css');
 const geometry=read('css/treasure-world-v2.css');
 const script=read('js/treasure-campaign-v2.js');
 const art=read('js/treasure-map-art.js');
 for(const id of ['thCampaignMap','thV2WorldCanvas','thV2WorldPins','thV2Area','thV2AreaCanvas']){
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Duplicate map id '+id);
 }
 assert.match(html,/id="thV2WorldCanvas" class="th-v2-world-canvas"/);
 assert.match(html,/id="thV2WorldPins" class="th-v2-world-sections"/);
 assert.match(geometry,/aspect-ratio:600\/760/);
 assert.match(geometry,/width:100%;min-width:0;max-width:100%/);
 assert.match(script,/currentWorldPin\.scrollIntoView/);
 assert.match(art,/world-overview\.svg/);
 for(const className of ['th-v2-world-canvas','th-v2-world-section','th-v2-world-pin','th-v2-map-section','th-v2-node']){
   assert.doesNotMatch(ui,new RegExp('\\.'+className+'\\s*\\{'),
     'UI-only skin must not restyle map element '+className);
 }
});

test('Water World-specific chrome is isolated from Treasure Hunt gameplay and area views',()=>{
 const css=read('css/treasure-world-ui.css');
 const html=read('treasure-hunt.html');
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-header/);
 assert.match(css,/#thV2World \.th-v2-map-explain\.th-v2-world-status\{/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/<section class="th-panel" aria-label="Treasure Hunt level" hidden>/);
 assert.match(html,/id="thV2Tutorial"/);
 assert.match(html,/id="thV2AreaTitle"/);
 assert.match(html,/id="thBoard"/);
});
