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
 assert.ok(html.indexOf('css/treasure-world-ui.css?v=1.5.29')>
           html.indexOf('css/treasure-world-v2.css?v=1.5.31'));
 assert.doesNotMatch(world,/th-v2-world-hero|th-v2-world-brand|th-v2-world-emblem/);
 assert.doesNotMatch(world,/thV2WorldTitle|thV2WorldStatus|Choose an area to explore/);
 assert.ok(world.indexOf('id="thV2WorldBack"')<world.indexOf('id="thV2WorldCanvas"'),
   'Floating navigation precedes the first map section');
 assert.match(world,/id="thV2WorldBack"/);
 assert.doesNotMatch(world,/th-v2-world-toolbar-label|Find my area|Explore the ocean/);
 assert.match(world,/class="th-v2-map-secondary th-v2-haiko-return"/);
 assert.doesNotMatch(ui,/th-v2-world-hero|th-v2-world-brand|th-v2-world-status/);
 assert.match(ui,/#thV2World \.th-v2-world-controls,/);
 assert.match(ui,/#thV2World #thV2WorldBack\.th-v2-haiko-return,/);
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
 assert.match(script,/pin\.scrollIntoView\?\.\(\{block:'center',behavior:'auto'\}\)/);
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
 assert.doesNotMatch(html,/id="thV2WorldTitle"|id="thV2WorldStatus"/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/<section class="th-panel" aria-label="Treasure Hunt level" hidden>/);
 assert.match(html,/id="thV2Tutorial"/);
 assert.match(html,/id="thV2AreaTitle"/);
 assert.match(html,/id="thBoard"/);
});

test('Return to Haiko is the same floating lower-left action on both maps',()=>{
 const html=read('treasure-hunt.html');
 const css=read('css/treasure-world-ui.css');
 const controller=read('js/treasure-campaign-v2.js');
 const ids=['thV2WorldBack','thV2AreaHere'];
 for(const id of ids){
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
   const match=html.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>[\\s\\S]*?<\\/button>'));
   assert.ok(match,'Missing '+id);
   assert.match(match[0],/class="th-v2-map-secondary th-v2-haiko-return"/);
   assert.match(match[0],/Return to Haiko/);
   assert.match(match[0],/th-v2-haiko-return-icon/);
   assert.match(controller,new RegExp("'"+id+"'\\)\\.addEventListener\\('click'"));
 }
 assert.equal((html.match(/Return to Haiko/g)||[]).length,2);
 assert.doesNotMatch(html,/Find my area|Find Haiko|Explore the ocean/);
 assert.match(css,/#thV2World \.th-v2-world-controls,\s*#thV2Area \.th-v2-area-controls\s*\{\s*position:fixed!important;/);
 assert.match(css,/left:max\(16px,calc\(\(100vw - 490px\)\/2 \+ 22px\)\)!important;/);
 assert.match(css,/bottom:calc\(16px \+ env\(safe-area-inset-bottom,0px\)\)!important;/);
 assert.match(css,/#thV2Area #thV2AreaHere\.th-v2-haiko-return\{/);
 assert.match(css,/@media\(max-width:360px\)/);
});

test('Water World opens directly on the geographic map without redundant instructional cards',()=>{
 const html=read('treasure-hunt.html');
 const controller=read('js/treasure-campaign-v2.js');
 const world=html.slice(html.indexOf('<section id="thV2World"'),html.indexOf('<section id="thV2Area"'));
 assert.doesNotMatch(world,/th-v2-world-hero|th-v2-world-heading|MORE AREAS|COMING SOON|Choose an area to explore/);
 assert.doesNotMatch(controller,/thV2WorldTitle|thV2WorldStatus/);
 assert.match(world,/id="thV2WorldBack"/);
 assert.match(world,/id="thV2WorldCanvas"/);
 assert.match(world,/id="thV2WorldPins"/);
 assert.match(world,/Return to Haiko/);
 assert.match(controller,/function renderWorld\(\)/);
 assert.match(controller,/worlds\.getAreas\(catalog,world\.id\)/);
});

test('Return controls start hidden and CSS honours hidden despite button display overrides',()=>{
 const html=read('treasure-hunt.html');
 const css=read('css/treasure-world-ui.css');
 const source=read('js/treasure-campaign-v2.js');
 for(const id of ['thV2WorldBack','thV2AreaHere']){
   assert.match(html,new RegExp('id="'+id+'" type="button" hidden'));
 }
 assert.match(css,/#thV2World #thV2WorldBack\[hidden\],\s*#thV2Area #thV2AreaHere\[hidden\]\s*\{\s*display:none!important;/);
 assert.match(source,/new root\.IntersectionObserver\(entries=>/);
 assert.match(source,/\{root:map,threshold:0\}/);
 assert.match(source,/haikoObserver\.disconnect\(\)/);
 assert.match(source,/watchHaiko\('world',marker\)/);
 assert.match(source,/watchHaiko\('area',marker\)/);
});

test('approved Haiko artwork is the single reusable progress cursor on both maps',()=>{
 const art=read('js/treasure-map-art.js');
 const script=read('js/treasure-campaign-v2.js');
 const css=read('css/treasure-world-ui.css');
 const html=read('treasure-hunt.html');
 assert.match(art,/HAIKO_IMAGE='images\/haiko-map-upright\.webp'/);
 assert.match(art,/haiko:HAIKO_IMAGE/);
 assert.match(html,/js\/treasure-map-art\.js\?v=1.5.26/);
 assert.match(html,/js\/treasure-campaign-v2\.js\?v=1.5.29/);
 assert.match(script,/function makeHaikoMarker\(areaId,description\)/);
 assert.match(script,/picture\.className='th-v2-haiko-sprite'/);
 assert.match(script,/picture\.src=art\.HAIKO_SPRITE_DATA/);
 assert.match(art,/HAIKO_SPRITE_DATA='data:image\/webp;base64,/);
 assert.match(css,/#thV2World \.th-v2-map-haiko \.th-v2-haiko-sprite,/);
 assert.match(script,/haiko\.classList\.add\('th-v2-world-haiko'\)/);
 assert.match(script,/haiko\.classList\.add\('th-v2-area-haiko'\)/);
 assert.match(script,/watchHaiko\('world',marker\)/);
 assert.match(script,/watchHaiko\('area',marker\)/);
 assert.match(css,/#thV2World \.th-v2-map-haiko\.th-v2-world-haiko,/);
 assert.match(css,/#thV2Area \.th-v2-map-haiko\.th-v2-area-haiko\{/);
 assert.match(css,/z-index:12/);
 assert.match(css,/background-image:\s*var\(--th-haiko-art,none\)/);
 assert.doesNotMatch(script,/th-v2-haiko-progress/);
 assert.doesNotMatch(css,/th-v2-haiko-progress/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Haiko is smaller and floats entirely above the destination marker on both maps',()=>{
 const css=read('css/treasure-world-ui.css');
 const html=read('treasure-hunt.html');
 const geometry=read('css/treasure-world-v2.css');
 assert.match(html,/css\/treasure-world-ui\.css\?v=1\.5\.29/);
 assert.match(css,/transform:translate\(-50%,calc\(-100% - 48px\)\)/);
 assert.match(css,/width:96px;\s*height:126px;\s*border:0;/);
 assert.match(css,/@media\(max-width:350px\)[\s\S]*?width:80px;\s*height:110px;/);
 assert.match(css,/bottom:-12px;\s*left:50%;\s*width:0;/);
 // At the lowered swim-animation extreme the pointer still ends above the
 // ~61px level button (its upper edge is about 31px above center).
 const arrowTipAtLowest=-48+12+2;
 const levelTop=-61/2;
 const worldTop=-53/2;
 assert.ok(arrowTipAtLowest<levelTop);
 assert.ok(arrowTipAtLowest<worldTop);
 assert.match(geometry,/\.th-v2-world-pin\{/);
 assert.match(geometry,/\.th-v2-node\{/);
});

test('area completion is displayed below the area name, never below Haiko',()=>{
 const html=read('treasure-hunt.html');
 const script=read('js/treasure-campaign-v2.js');
 const css=read('css/treasure-world-v2.css');
 assert.match(html,/<h2 id="thV2AreaTitle">Coral Coast<\/h2><p class="th-v2-area-progress" id="thV2AreaSummary"/);
 assert.match(script,/button\.textContent=area\.title;/);
 assert.match(script,/status\.className='th-v2-world-pin-progress'/);
 assert.match(script,/status\.textContent=access\.available/);
 assert.match(script,/button\.append\(status\)/);
 assert.match(css,/\.th-v2-world-pin\{[^}]*display:flex;/);
 assert.match(css,/\.th-v2-world-pin\{[^}]*flex-direction:column;/);
 assert.match(css,/\.th-v2-world-pin-progress\{/);
 assert.match(script,/areaSummary\.textContent=cleared\+' \/ '\+area\.levelIds\.length\+' CLEARED/);
 assert.match(css,/#thV2Area \.th-v2-area-progress\{/);
 assert.doesNotMatch(script,/marker\.append\(label\)/);
});
