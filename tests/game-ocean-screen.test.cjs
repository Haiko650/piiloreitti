'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('illustrated Daily gameplay uses an independent replaceable reef skin',()=>{
  const html=read('index.html');
  const css=read('css/game-ocean.css');
  const theme=html.indexOf('css/game-ocean.css');
  assert.ok(theme>html.indexOf('css/visual-assets.css')&&theme>html.indexOf('css/settings-ocean.css'),
    'Game screen CSS should override existing page fallbacks');
  assert.match(html,/class="pathle-game-logo" src="images\/pathle-logo\.webp/);
  assert.match(html,/class="gameOceanGuide" aria-hidden="true"/);
  assert.match(html,/id="board"/);
  assert.ok(html.indexOf('id="board"')<html.indexOf('id="attemptInfo"'),
    'Attempts ribbon should sit below the board like the approved mockup');
  assert.match(css,/body\.game-active #gameScreen \.gameOcean/);
  assert.match(css,/body\.game-active #playPanel #board\.board/);
  assert.match(css,/body\.game-active #board \.tile\.goal/);
  assert.match(css,/body\.game-active #playPanel \.actions button\.primary/);
  assert.match(css,/@media\(max-height:780px\)/);
  assert.match(css,/@media\(max-height:655px\)/);
  assert.doesNotMatch(css,/\.tile\s*\{[^}]*pointer-events\s*:\s*none/);
});

test('pirate-map goal, shell pearl and reef coral remain separate from the water tiles',()=>{
  const game=read('js/game.js');
  const visuals=read('js/visual-assets.js');
  assert.match(game,/const treasureSVG='<svg class="treasure-icon"/);
  assert.match(game,/pirateMapPaper/);
  assert.match(game,/stroke="#ea4637"/);
  assert.match(game,/const pearlSVG='<svg class="pearl-icon"/);
  assert.match(game,/pearlShell/);
  assert.match(game,/const coralSVG='<svg class="coral-icon"/);
  assert.match(game,/coralPink/);
  assert.match(visuals,/const WATER_TILE='images\/skins\/pathle-water-tile\.webp'/);
  assert.match(game,/visualAssets\.decorateTile\(t,visualAssets\.terrainFor\(b,id,obstacle\)/);
});

test('Treasure Hunt shares gameplay chrome without restyling world or area maps',()=>{
  const html=read('treasure-hunt.html');
  const css=read('css/game-ocean.css');
  assert.match(html,/css\/game-ocean\.css\?v=[a-f0-9]{12}/);
  assert.match(css,/body\.th-page:has\(\.th-panel:not\(\[hidden\]\)\)/);
  assert.match(css,/body\.th-page \.th-panel:not\(\[hidden\]\) \.th-board/);
  assert.doesNotMatch(css,/\.th-v2-(?:world|area|map)-/);
});
