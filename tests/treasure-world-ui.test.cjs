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
 assert.ok(html.indexOf('css/treasure-world-ui.css?v=9b25f2b8a892')>
           html.indexOf('css/treasure-world-v2.css?v=c51ed6001229'));
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
 assert.match(script,/focusHaiko\('world',pin,marker\)/);
 assert.match(art,/coral-coast-overview\.webp/);
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

test('Both Return to Haiko buttons show the optimized lost-looking Haiko sprite',()=>{
 const html=read('treasure-hunt.html');
 const css=read('css/treasure-world-ui.css');
 const filename='images/haiko-return-lost.webp';
 const image=fs.readFileSync(path.join(__dirname,'..',filename));
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
 assert.ok(image.length>10_000&&image.length<80_000);
 const digest=require('node:crypto').createHash('sha1')
   .update('blob '+image.length+String.fromCharCode(0)).update(image)
   .digest('hex').slice(0,12);
 const expected=filename+'?v='+digest;
 for(const id of ['thV2WorldBack','thV2AreaHere']){
   const button=html.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>[\\s\\S]*?<\\/button>'))?.[0];
   assert.ok(button,'Missing '+id);
   assert.ok(button.includes('src="'+expected+'"'),'Lost Haiko missing in '+id);
   assert.match(button,/class="th-v2-return-haiko-img"/);
   assert.doesNotMatch(button,/🦈/,'Old emoji must not be inside '+id);
 }
 assert.ok(css.includes('#thV2World .th-v2-haiko-return-icon .th-v2-return-haiko-img,'));
 assert.ok(css.includes('#thV2Area .th-v2-haiko-return-icon .th-v2-return-haiko-img{'));
 assert.match(css,/object-fit:contain;/);
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
 assert.match(source,/watchHaiko\('world',marker,pin\)/);
 assert.match(source,/watchHaiko\('area',marker,node\)/);
});

test('approved Haiko artwork is the single reusable progress cursor on both maps',()=>{
 const art=read('js/treasure-map-art.js');
 const script=read('js/treasure-campaign-v2.js');
 const css=read('css/treasure-world-ui.css');
 const html=read('treasure-hunt.html');
 assert.match(art,/HAIKO_IMAGE='images\/haiko-map-upright\.webp'/);
 assert.match(art,/haiko:HAIKO_IMAGE/);
 assert.match(html,/js\/treasure-map-art\.js\?v=ac3222a2b534/);
 assert.match(html,/js\/treasure-campaign-v2\.js\?v=3024bea6170d/);
 assert.match(script,/function makeHaikoMarker\(areaId,description\)/);
 assert.match(script,/picture\.className='th-v2-haiko-sprite'/);
 assert.match(script,/picture\.src=art\.HAIKO_SPRITE_DATA/);
 assert.match(art,/HAIKO_SPRITE_DATA='data:image\/webp;base64,/);
 assert.match(css,/#thV2World \.th-v2-map-haiko \.th-v2-haiko-sprite,/);
 assert.match(script,/haiko\.classList\.add\('th-v2-world-haiko'\)/);
 assert.match(script,/haiko\.classList\.add\('th-v2-area-haiko'\)/);
 assert.match(script,/watchHaiko\('world',marker,pin\)/);
 assert.match(script,/watchHaiko\('area',marker,node\)/);
 assert.match(css,/#thV2World \.th-v2-map-haiko\.th-v2-world-haiko,/);
 assert.match(css,/#thV2Area \.th-v2-map-haiko\.th-v2-area-haiko\{/);
 assert.match(css,/z-index:24/);
 assert.doesNotMatch(css,/z-index:12/);
 assert.match(css,/background-image:\s*var\(--th-haiko-art,none\)/);
 assert.doesNotMatch(script,/th-v2-haiko-progress/);
 assert.doesNotMatch(css,/th-v2-haiko-progress/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Haiko is smaller and floats entirely above the destination marker on both maps',()=>{
 const css=read('css/treasure-world-ui.css');
 const html=read('treasure-hunt.html');
 const geometry=read('css/treasure-world-v2.css');
 assert.match(html,/css\/treasure-world-ui\.css\?v=9b25f2b8a892/);
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

test('Water World header panel is transparent but the three header controls remain',()=>{
 const css=read('css/treasure-world-ui.css');
 const html=read('treasure-hunt.html');
 const selector='body.th-page:has(#thV2World:not([hidden])) .th-header';
 const start=css.indexOf(selector+'{');
 assert.ok(start>=0);
 const declaration=css.slice(start+selector.length+1,css.indexOf('}',start));
 assert.match(declaration,/border:0;/);
 assert.match(declaration,/background:transparent;/);
 assert.match(declaration,/box-shadow:none;/);
 const shine=css.slice(css.indexOf(selector+'::before{'),css.indexOf('}',css.indexOf(selector+'::before{')));
 assert.match(shine,/content:none;/);
 assert.match(shine,/display:none;/);
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-back\{/);
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-test-badge\{/);
 assert.match(html,/class="th-heading"><small>HAIKO’S ADVENTURE<\/small><h1>Treasure Hunt<\/h1>/);
 assert.match(html,/class="th-test-badge" id="thMapTotal"/);
 assert.match(html,/css\/treasure-world-ui\.css\?v=9b25f2b8a892/);
});

test('the World geographic image starts behind three independent floating header elements',()=>{
 const css=read('css/treasure-world-ui.css');
 const base=read('css/treasure.css');
 const html=read('treasure-hunt.html');
 assert.match(base,/\.th-shell\s*\{[^}]*display: flex; flex-direction: column/);
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-shell\{\s*position:relative;\s*padding:0;\s*gap:0;/);
 const fullMap='#thCampaignMap.th-v2-campaign-map:has(#thV2World:not([hidden]))';
 const pos=css.indexOf(fullMap+'{');
 assert.ok(pos>=0,'World map needs independent fullscreen positioning');
 const mapRules=css.slice(pos+fullMap.length+1,css.indexOf('}',pos));
 assert.match(mapRules,/position:fixed;/);
 assert.match(mapRules,/inset:0;/);
 assert.match(mapRules,/width:100vw;/);
 assert.match(mapRules,/height:100dvh;/);
 assert.match(mapRules,/min-height:100dvh;/);
 assert.match(mapRules,/max-height:100dvh;/);
 assert.match(mapRules,/overflow-y:auto;/);
 assert.match(mapRules,/z-index:1;/);
 assert.match(mapRules,/margin:0;/);
 assert.match(mapRules,/background:transparent;/);
 const selector='body.th-page:has(#thV2World:not([hidden])) .th-header';
 const at=css.indexOf(selector+'{');
 const declaration=css.slice(at,css.indexOf('}',at));
 assert.match(declaration,/position:fixed;/);
 assert.match(declaration,/z-index:100;/);
 assert.match(declaration,/left:max\(12px,calc\(\(100vw - 490px\)\/2 \+ 12px\)\)/);
 assert.match(declaration,/right:max\(12px,calc\(\(100vw - 490px\)\/2 \+ 12px\)\)/);
 assert.match(declaration,/top:calc\(10px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(declaration,/pointer-events:none;/);
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-back\{\s*pointer-events:auto;/);
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-heading\{\s*pointer-events:none;/);
 assert.match(declaration,/background:transparent;/);
 assert.match(declaration,/box-shadow:none;/);
 assert.match(html,/<header class="th-header">[\s\S]*?class="th-back"[\s\S]*?class="th-heading"[\s\S]*?class="th-test-badge"/);
 assert.match(html,/id="thV2WorldCanvas"/);
 // Both illustrated maps now float the header; tutorial and levels do not.
 assert.match(css,/body\.th-page:has\(#thV2Area:not\(\[hidden\]\)\) \.th-header/);
 assert.doesNotMatch(css,/body\.th-page:has\(#thV2Tutorial:not\(\[hidden\]\)\) \.th-header/);
});

test('the overlay map does not reveal the body gradient behind the toolbar',()=>{
 const css=read('css/treasure-world-ui.css');
 const mapCSS=read('css/treasure-world-v2.css');
 const html=read('treasure-hunt.html');
 // This is the regression for a visible monochrome strip under the header:
 // the previous .th-campaign-map flex child was not guaranteed to reach y=0.
 const overlay=css.match(/#thCampaignMap\.th-v2-campaign-map:has\(#thV2World:not\(\[hidden\]\)\)\{([^}]+)\}/);
 assert.ok(overlay);
 for(const token of ['position:fixed','inset:0','height:100dvh','padding:0','overflow-y:auto']){
   assert.ok(overlay[1].includes(token),token);
 }
 const header=css.match(/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-header\{([^}]+)\}/);
 assert.ok(header);
 assert.ok(header[1].includes('position:fixed'));
 assert.ok(!header[1].includes('background:linear-gradient'));
 assert.match(mapCSS,/\.th-v2-world-art\{/);
 assert.match(mapCSS,/\.th-v2-world-section\{/);
 assert.match(html,/id="thV2WorldPins"/);
});

test('Coral Coast fills the screen behind independently floating headers',()=>{
 const css=read('css/treasure-world-ui.css');
 const geometry=read('css/treasure-world-v2.css');
 const html=read('treasure-hunt.html');
 const area='body.th-page:has(#thV2Area:not([hidden]))';
 const mapSelector='#thCampaignMap.th-v2-campaign-map:has(#thV2Area:not([hidden]))';
 const block=selector=>{
   const at=css.indexOf(selector+'{');
   assert.ok(at>=0,'Missing '+selector);
   return css.slice(at+selector.length+1,css.indexOf('}',at));
 };
 assert.match(block(area+' .th-shell'),/position:relative;[\s\S]*?padding:0;[\s\S]*?gap:0;/);
 const m=block(mapSelector);
 for(const field of ['position:fixed','inset:0','z-index:1','width:100vw',
   'height:100dvh','min-height:100dvh','max-height:100dvh',
   'margin:0','padding:0','overflow-y:auto','background:transparent']){
   assert.ok(m.includes(field),'Area map must cover viewport: '+field);
 }
 const header=block(area+' .th-header');
 assert.match(header,/position:fixed;/);
 assert.match(header,/z-index:100;/);
 assert.match(header,/pointer-events:none;/);
 assert.match(header,/background:transparent;/);
 assert.match(header,/border:0;/);
 assert.match(header,/box-shadow:none;/);
 const transparentShine=block(area+' .th-header::before');
 assert.match(transparentShine,/content:none;/);
 assert.match(transparentShine,/display:none;/);
 assert.match(block(area+' .th-back'),/pointer-events:auto;/);
 assert.match(block(area+' .th-heading'),/pointer-events:none;/);
 assert.match(block(area+' .th-test-badge'),/background:linear-gradient/);
 const second=block('#thV2Area .th-v2-map-heading');
 assert.match(second,/position:fixed;/);
 assert.match(second,/z-index:95;/);
 assert.match(second,/background:transparent;/);
 assert.match(second,/pointer-events:none;/);
 assert.match(block('#thV2Area #thV2AreaWorld'),/pointer-events:auto;/);
 assert.match(geometry,/\.th-v2-area-canvas\{[\s\S]*?position:relative;/);
 assert.match(geometry,/\.th-v2-map-section\{/);
 assert.ok(html.indexOf('id="thV2AreaTitle"')<html.indexOf('id="thV2AreaCanvas"'));
 assert.match(html,/css\/treasure-world-ui\.css\?v=9b25f2b8a892/);
});

test('scrolling and tapping Coral Coast remain controlled by the same map',()=>{
 const css=read('css/treasure-world-ui.css');
 const js=read('js/treasure-campaign-v2.js');
 const html=read('treasure-hunt.html');
 assert.match(css,/#thCampaignMap\.th-v2-campaign-map:has\(#thV2Area:not\(\[hidden\]\)\)\{[\s\S]*?overflow-y:auto;/);
 assert.match(js,/focusHaiko\('area',node,marker\)/);
 assert.match(js,/watchHaiko\('area',marker,node\)/);
 assert.match(js,/\$\('thV2AreaWorld'\)\.addEventListener\('click'/);
 assert.match(html,/id="thV2AreaWorld"/);
 assert.match(html,/id="thV2AreaCanvas"/);
});

test('Coral Coast foreground map has a geographic fallthrough behind the floating controls',()=>{
 const ui=read('css/treasure-world-ui.css');
 const html=read('treasure-hunt.html');
 const home=read('index.html');
 const art=read('images/maps/water-world/coral-coast/section-01-base.svg');
 const selector='#thCampaignMap.th-v2-campaign-map:has(#thV2Area:not([hidden]))';
 const begin=ui.indexOf(selector+'{');
 assert.ok(begin>=0);
 const declarations=ui.slice(begin+selector.length+1,ui.indexOf('}',begin));
 assert.match(declarations,/position:fixed;/);
 assert.match(declarations,/inset:0;/);
 assert.match(declarations,/background-image:url\("\.\.\/images\/maps\/water-world\/coral-coast\/section-01-base\.svg\?v=eae2d4b1a735"\);/);
 assert.match(declarations,/background-attachment:local;/);
 assert.match(declarations,/background-size:100% 1300px;/);
 assert.match(declarations,/overflow-y:auto;/);
 assert.match(art,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
 assert.match(html,/css\/treasure-world-ui\.css\?v=9b25f2b8a892/);
 assert.match(home,/id="playTreasure" href="treasure-hunt\.html\?v=1\.5\.56"/);
});

test('Coral Coast map footer has no instructional text or oversized empty padding',()=>{
 const html=read('treasure-hunt.html');
 const css=read('css/treasure-world-ui.css');
 assert.doesNotMatch(html,/class="th-v2-map-explain"/);
 assert.doesNotMatch(html,/Start at the bottom and follow the winding reef trail upward/);
 assert.match(css,/#thV2AreaCanvas\.th-v2-area-canvas\{\s*padding-top:24px;\s*padding-bottom:24px;/);
 assert.match(html,/id="thV2AreaSummary"/,'Keep the progress total near the title');
});

test('Haiko is centered in safe space instead of beneath floating text',()=>{
 const css=read('css/treasure-world-ui.css');
 const js=read('js/treasure-campaign-v2.js');
 const html=read('treasure-hunt.html');
 assert.match(js,/function haikoSafeBounds\(kind\)/);
 assert.match(js,/function focusHaiko\(kind,pin,marker,behavior='auto'\)/);
 assert.match(js,/areaHeading=kind==='area'/);
 assert.match(js,/const currentCenter=\(groupTop\+groupBottom\)\/2/);
 assert.match(js,/const target=Math\.max\(0,Math\.min\(maximum,map\.scrollTop\+delta\)\)/);
 assert.match(js,/map\.scrollTo\(\{top:Math\.round\(target\),behavior\}\)/);
 assert.match(js,/focusHaiko\('world',currentWorldPin,currentWorldMarker,'smooth'\)/);
 assert.match(js,/focusHaiko\('area',currentAreaNode,currentAreaMarker,'smooth'\)/);
 assert.match(css,/#thV2AreaCanvas\.th-v2-area-canvas\{\s*padding-top:24px;\s*padding-bottom:24px;/);
 assert.match(css,/#thV2AreaCanvas\.th-v2-area-canvas::before\{\s*display:none;/);
 assert.match(css,/scroll-padding-top:calc\(190px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(css,/scroll-padding-top:calc\(105px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(html,/js\/treasure-campaign-v2\.js\?v=3024bea6170d/);
});

test('Haiko stays rendered at its map coordinates during scrolling',()=>{
 const css=read('css/treasure-world-ui.css');
 const js=read('js/treasure-campaign-v2.js');
 assert.doesNotMatch(css,/th-v2-haiko-occluded/);
 assert.doesNotMatch(js,/th-v2-haiko-occluded/);
 assert.doesNotMatch(js,/marker\.classList\.(?:add|remove)\(/);
 assert.match(js,/button\.hidden=clear/);
 assert.match(js,/map\.addEventListener\?\.\('scroll',update,\{passive:true\}\)/);
 assert.match(js,/focusHaiko\('area',currentAreaNode,currentAreaMarker,'smooth'\)/);
 assert.match(css,/#thV2Area \.th-v2-map-haiko\.th-v2-area-haiko\{/);
 assert.match(css,/\.th-v2-haiko-sprite\{[\s\S]*?visibility:visible!important;/);
});

test('approved Water World logo replaces only the overview labels',()=>{
 const html=read('treasure-hunt.html');
 const css=read('css/treasure-world-ui.css');
 const fs=require('node:fs');
 const path=require('node:path');
 const art=fs.readFileSync(path.join(__dirname,'..','images/water-world-logo.webp'));
 assert.equal(art.toString('ascii',0,4),'RIFF');
 assert.equal(art.toString('ascii',12,16),'VP8X');
 assert.equal(1+art.readUIntLE(24,3),600);
 assert.equal(1+art.readUIntLE(27,3),200);
 assert.match(html,/<img class="th-water-world-logo" src="images\/water-world-logo\.webp\?v=f165cd36d510" width="600" height="200" alt="Water World"/);
 assert.match(css,/\.th-water-world-logo\{display:none\}/);
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-heading,\s*body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-test-badge\{\s*display:none!important;/);
 assert.match(css,/body\.th-page:has\(#thV2World:not\(\[hidden\]\)\) \.th-header \.th-water-world-logo\{\s*display:block;/);
 assert.match(css,/width:min\(64vw,260px\)/);
 assert.match(css,/max-width:calc\(100% - 80px\)/);
 assert.match(html,/class="th-back" href="index.html\?pathle-update=1\.5\.56"/);
 assert.match(html,/<section id="thV2Area" class="th-v2-area"/);
 assert.doesNotMatch(css,/body\.th-page:has\(#thV2Area:not\(\[hidden\]\)\) \.th-heading,\s*body\.th-page:has\(#thV2Area:not\(\[hidden\]\)\) \.th-test-badge\{\s*display:none/);
 assert.match(html,/css\/treasure-world-ui\.css\?v=9b25f2b8a892/);
});

test('Water World and Coral Coast share the same home button and navigation',()=>{
 const html=read('treasure-hunt.html');
 const css=read('css/treasure-world-ui.css');
 const js=read('js/treasure-campaign-v2.js');
 assert.ok(html.includes('<a class="th-back" href="index.html?pathle-update=1.5.56"'));
 assert.ok(html.includes('class="th-back-home-icon"'));
 assert.ok(html.includes('class="th-back-arrow"'));
 const world='body.th-page:has(#thV2World:not([hidden]))';
 const area='body.th-page:has(#thV2Area:not([hidden]))';
 assert.ok(css.includes(world+' .th-back .th-back-arrow,\n'+area+' .th-back .th-back-arrow{display:none}'),
   'Both maps must hide the back arrow');
 assert.ok(css.includes(world+' .th-back .th-back-home-icon,\n'+area+' .th-back .th-back-home-icon{'),
   'Both maps must use the identical home icon rule');
 assert.ok(css.includes('.th-back-home-icon{display:none}'),
   'Tutorial and puzzle keep original back arrow');
 assert.ok(js.includes("(which==='world'||which==='area')?'Go to main menu':'Go back one screen'"));
 assert.ok(js.includes("if(view==='world'||view==='area'){"));
 assert.ok(js.includes("root.location.assign(home+separator+'fresh='+Date.now())"));
 assert.ok(js.includes("$('thV2AreaWorld').addEventListener('click',goBackOneStep)"),
   'Separate World button still returns to Water World');
 assert.ok(html.includes('js/treasure-campaign-v2.js?v=3024bea6170d'));
});

test('returning home and checking updates always request a fresh index document',()=>{
 const html=read('treasure-hunt.html');
 const js=read('js/treasure-campaign-v2.js');
 const home=read('index.html');
 assert.match(html,/class="th-back" href="index\.html\?pathle-update=1\.5\.56"/);
 assert.match(js,/headerBack\?\.getAttribute\?\.\('href'\)\|\|'index\.html'/);
 assert.match(js,/root\.location\.assign\(home\+separator\+'fresh='\+Date\.now\(\)\)/);
 assert.match(home,/js\/version\.js\?v=e710bebd7099/);
 assert.match(home,/id="playTreasure" href="treasure-hunt\.html\?v=1\.5\.56"/);
 assert.match(read('js/version.js'),/url\.searchParams\.set\('fresh',String\(Date\.now\(\)\)\)/);
});

test('Coral Coast uses CSS medallions with fins only, never numeric ratings',()=>{
 const css=read('css/treasure-world-v2.css');
 const controller=read('js/treasure-campaign-v2.js');
 const region=css.slice(css.indexOf('/* DEV 1.5.46: Coral Coast level medallions.'));
 assert.ok(region.includes('#thV2Area .th-v2-node{'));
 assert.match(region,/width:70px;/);
 assert.match(region,/height:70px;/);
 assert.match(region,/border:4px solid #fff4d5;/);
 assert.match(region,/\.th-v2-fin-rating\{/);
 assert.match(region,/\.th-v2-fin-icon\{/);
 assert.match(region,/clip-path:polygon\(/);
 for(const tier of ['gold','silver','blue'])
   assert.ok(region.includes('.th-v2-fin-rating--'+tier+' .th-v2-fin-icon')||
     (tier==='gold'&&region.includes('#thV2Area .th-v2-fin-icon{')),
     'Each rating tier must display in its own material color: '+tier);
 assert.match(controller,/const earned=score===null\?0:finsFor\(id,score\)/);
 assert.match(controller,/for\(let fin=0;fin<earned;fin\+\+\)/);
 assert.match(controller,/rating\.setAttribute\('aria-hidden','true'\)/);
 assert.doesNotMatch(controller,/medal\.textContent=/);
 assert.doesNotMatch(controller,/button\.append\(number,medal\)/);
 assert.match(css,/#thV2Area \.th-v2-node:focus-visible/);
 assert.match(css,/#thV2Area \.th-v2-node\.is-locked:disabled/);
});
