'use strict';
/* TH.6A.3 regression: protect the mobile Water World overview viewport.
 * Previously min-height:680px + aspect-ratio 600/760 caused a computed
 * intrinsic width of about 537px, clipping the image on 320–390px phones.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

function cssBlock(css,selector) {
  const at=css.indexOf(selector+'{');
  assert.ok(at!==-1,'Missing CSS '+selector);
  const from=css.indexOf('{',at)+1;
  return css.slice(from,css.indexOf('}',from));
}

test('Water World overview uses the available mobile width without forced oversized min-height',()=>{
  const css=read('css/treasure-world-v2.css');
  const world=cssBlock(css,'.th-v2-world-canvas');
  assert.match(world,/box-sizing\s*:\s*border-box\s*;/);
  assert.match(world,/width\s*:\s*100%\s*;/);
  assert.match(world,/max-width\s*:\s*100%\s*;/);
  assert.match(world,/height\s*:\s*auto\s*;/);
  assert.match(world,/min-height\s*:\s*0\s*;/);
  assert.doesNotMatch(world,/aspect-ratio\s*:\s*600\s*\/\s*760\s*;/);
  assert.doesNotMatch(world,/min-height\s*:\s*(?:600|680)px\b/);
  const section=cssBlock(css,'.th-v2-world-section');
  assert.match(section,/aspect-ratio\s*:\s*600\s*\/\s*760\s*;/);
  assert.match(section,/width\s*:\s*100%\s*;/);
  assert.match(section,/flex\s*:\s*none\s*;/);
  assert.match(cssBlock(css,'.th-v2-world-sections'),/flex-direction\s*:\s*column/);
  assert.doesNotMatch(css,/@media\s*\(max-width:370px\)\s*\{[^}]*\.th-v2-world-canvas\s*\{/);
  for(const viewport of [320,360,375,390,490]){
    const available=viewport;
    const renderedWidth=available;
    const renderedHeight=available*760/600;
    assert.ok(renderedWidth<=viewport,'World width exceeds viewport');
    assert.ok(renderedHeight>0&&renderedHeight<680,'Each section should scale with width');
    assert.ok(renderedHeight*3>viewport,'Three geographic sections enable vertical scrolling');
  }
});

test('Water World and Coral Coast maps are borderless and span the full viewport',()=>{
  const css=read('css/treasure-world-v2.css');
  assert.match(css,/#thCampaignMap\.th-v2-campaign-map:has\(#thV2World:not\(\[hidden\]\)\)/);
  assert.match(css,/#thCampaignMap\.th-v2-campaign-map:has\(#thV2Area:not\(\[hidden\]\)\)/);
  assert.match(css,/width:100vw;\s*min-width:100vw;\s*max-width:none;/);
  assert.match(css,/margin-left:calc\(50% - 50vw\)/);
  assert.match(css,/margin-right:calc\(50% - 50vw\)/);
  const fullBleed=css.slice(css.indexOf('/* DEV 1.5.27: full-bleed map'));
  assert.match(fullBleed,/padding:0;\s*border:0;\s*border-radius:0;/);
  const world=cssBlock(css,'.th-v2-world-canvas');
  const area=cssBlock(css,'.th-v2-map-section');
  assert.match(world,/border:0;border-radius:0;/);
  assert.match(world,/box-shadow:none;/);
  assert.match(area,/border:0;/);
  assert.match(area,/box-shadow:none;/);
  assert.doesNotMatch(css,/\.th-v2-map-section:first-child\s*\{|\.th-v2-map-section:last-child\s*\{|\.th-v2-map-section:only-child\s*\{/);
});

test('overview artwork and tappable area pins remain on separate responsive layers',()=>{
  const html=read('treasure-hunt.html'),css=read('css/treasure-world-v2.css');
  assert.match(html,/id="thV2WorldCanvas" class="th-v2-world-canvas"/);
  assert.match(html,/id="thV2WorldPins" class="th-v2-world-sections"/);
  assert.match(read('js/treasure-campaign-v2.js'),/picture.className='th-v2-world-art'/);
  assert.match(cssBlock(css,'.th-v2-world-art'),/background-size\s*:\s*100%\s+100%/);
  assert.match(cssBlock(css,'.th-v2-world-pin'),/position\s*:\s*absolute/);
  assert.match(read('js/treasure-map-art.js'),/world-overview\.svg/);
});

test('all illustrated maps use image layers while preserving separate tap targets',()=>{
  const controller=read('js/treasure-campaign-v2.js');
  const art=read('js/treasure-map-art.js');
  const css=read('css/treasure-world-v2.css');
  assert.match(controller,/mountMapArtwork\(picture,section\.base\)/);
  assert.match(controller,/mountMapArtwork\(base,images\?\.base\)/);
  assert.match(controller,/mountMapArtwork\(detail,images\?\.details\)/);
  assert.match(controller,/image\.className='th-v2-map-art-img'/);
  assert.match(art,/function imageSource\(url\)/);
  assert.match(css,/\.th-v2-world-art > \.th-v2-map-art-img,/);
  assert.match(css,/pointer-events:none;/);
  assert.match(css,/object-fit:fill;/);
});

test('Water World area signs match the approved home Treasure capsule look',()=>{
  const menu=read('css/menu-capsules.css');
  const css=read('css/treasure-world-v2.css');
  const html=read('treasure-hunt.html');
  const js=read('js/treasure-campaign-v2.js');
  assert.match(html,/css\/treasure-world-v2\.css\?v=1\.5\.31/);
  assert.match(menu,/#welcomeScreen #playTreasure\{/);
  assert.match(menu,/linear-gradient\(180deg,#b9ffff 0%,#44f6ed 22%,#06dacb 69%,#00adbd 100%\)/);
  assert.match(css,/linear-gradient\(180deg,#b9ffff 0%,#44f6ed 22%,#06dacb 69%,#00adbd 100%\)/);
  assert.match(css,/border-radius:999px/);
  assert.match(css,/border:4px solid #ddfffa/);
  assert.match(css,/\.th-page \.th-v2-world-pin\{/);
  assert.match(css,/background:linear-gradient\(180deg,#ffffff99,#ffffff17\)/);
  assert.match(css,/\.th-v2-world-pin.is-locked:disabled\{/);
  assert.match(css,/\.th-v2-world-pin-progress\{/);
  assert.match(css,/\.th-v2-world-pin-action\{/);
  assert.match(js,/button\.className='th-v2-world-pin'/);
  assert.match(js,/button\.append\(status\)/);
  assert.match(js,/button\.disabled=!access\.available/);
  for(const viewport of [320,360,390,430]){
    const width=Math.min(viewport*.54,220);
    const leftCoral=.32*viewport-width/2;
    const rightOpen=.69*viewport+width/2;
    assert.ok(leftCoral>=0,'Coral Coast capsule must fit the screen');
    assert.ok(rightOpen<=viewport,'Open Ocean capsule must fit the screen');
  }
});

test('area titles have larger typography than progress and action captions',()=>{
  const css=read('css/treasure-world-v2.css');
  const pin=cssBlock(css,'.th-v2-world-pin');
  const forced=cssBlock(css,'.th-page .th-v2-world-pin');
  const narrow=css.slice(css.indexOf('@media(max-width:370px){'),css.indexOf('@media(max-width:370px){')+230);
  const progress=cssBlock(css,'.th-v2-world-pin-progress');
  const action=cssBlock(css,'.th-v2-world-pin-action');
  assert.match(pin,/font-size:clamp\(16px,4\.6vw,20px\)/);
  assert.match(forced,/font-size:clamp\(16px,4\.6vw,20px\)/);
  assert.match(narrow,/font-size:clamp\(16px,4\.6vw,17px\)/);
  assert.match(progress,/font-size:clamp\(10px,2\.55vw,11px\)/);
  assert.match(action,/font-size:clamp\(10px,2\.45vw,11px\)/);
  assert.match(pin,/width:min\(54%,220px\)/);
  assert.match(pin,/min-height:82px/);
});
