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
  assert.match(world,/aspect-ratio\s*:\s*600\s*\/\s*760\s*;/);
  assert.doesNotMatch(world,/min-height\s*:\s*(?:600|680)px\b/);
  assert.doesNotMatch(css,/@media\s*\(max-width:370px\)\s*\{[^}]*\.th-v2-world-canvas\s*\{/);
  for(const viewport of [320,360,375,390,490]){
    const available=viewport-24-20-4;
    const renderedWidth=available;
    const renderedHeight=available*760/600;
    assert.ok(renderedWidth<=viewport,'World width exceeds viewport');
    assert.ok(renderedHeight>0&&renderedHeight<680,'Viewport height should scale with width');
  }
});

test('overview artwork and tappable area pins remain on separate responsive layers',()=>{
  const html=read('treasure-hunt.html'),css=read('css/treasure-world-v2.css');
  assert.match(html,/id="thV2WorldCanvas" class="th-v2-world-canvas"/);
  assert.match(html,/class="th-v2-world-art"/);
  assert.match(html,/id="thV2WorldPins"/);
  assert.match(cssBlock(css,'.th-v2-world-art'),/background-size\s*:\s*100%\s+100%/);
  assert.match(cssBlock(css,'.th-v2-world-pins'),/position\s*:\s*absolute/);
  assert.match(cssBlock(css,'.th-v2-world-pin'),/position\s*:\s*absolute/);
  assert.match(read('js/treasure-map-art.js'),/world-overview\.svg/);
});
