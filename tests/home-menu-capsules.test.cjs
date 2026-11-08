'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

const IDs=['playDaily','playTreasure','openHideout'];

test('three approved home-menu actions follow the same DOM and visual order',()=>{
  const html=read('index.html');
  const positions=IDs.map(id=>html.indexOf('id="'+id+'"'));
  assert.ok(positions.every((pos,i)=>pos>0&&(i===0||pos>positions[i-1])));
  for(const id of IDs){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  }
  assert.match(html,/<a class="menuButton menuTreasure" id="playTreasure" href="treasure-hunt\.html\?v=1\.5\.37">/);
  assert.doesNotMatch(html,/css\/treasure-home\.css/);
  assert.doesNotMatch(html,/playPractice|menuPractice|Practice Mode|practiceNote/);
});

test('a single dedicated stylesheet owns the main-menu button visuals',()=>{
  const html=read('index.html');
  const legacy=read('css/styles.css');
  const capsules=read('css/menu-capsules.css');
  assert.match(html,/css\/menu-capsules\.css\?v=20261106-compact/);
  assert.doesNotMatch(legacy,/\.(?:menuButton|menuDaily|menuTreasure|menuPractice|menuHideout|menuIcon)\b|#(?:playDaily|playTreasure|playPractice|openHideout)\b/);
  for(const id of IDs){
    assert.ok(capsules.includes('#'+id+'{'),'Missing '+id+' styling');
  }
  assert.match(capsules,/@media\(max-height:620px\)/);
  assert.match(capsules,/@media\(max-height:520px\)/);
  assert.match(capsules,/#welcomeScreen #playDaily:disabled/);
  assert.doesNotMatch(capsules,/playPractice|menuPractice/);
});

test('menu progression remains available without altering gameplay files',()=>{
  const html=read('index.html');
  for(const id of ['adventureCard','homeWeekDots','journeyQuick','homeSettings','howPlaySettings','musicSwitch','ambientSwitch']){
    assert.ok(html.includes('id="'+id+'"'),id+' missing');
  }
  assert.match(html,/id="dailyButtonHint"/);
  assert.match(read('css/menu-capsules.css'),/text-overflow:ellipsis!important;/);
});

test('Practice Mode implementation is removed while DEV day testing remains available',()=>{
  const game=read('js/game.js');
  const html=read('index.html');
  const styles=read('css/styles.css');
  const capsules=read('css/menu-capsules.css');
  for(const [name,source] of [['game.js',game],['index.html',html],['styles.css',styles],['menu-capsules.css',capsules]]){
    assert.doesNotMatch(source,/practice|newPractice|makePracticeBoard|playPractice/i,name+' contains removed Practice Mode');
  }
  assert.match(game,/startGame\('dev'\)/);
  assert.match(game,/startGame\('daily'\)/);
  assert.match(html,/id="launchDev"/);
  assert.match(game,/function ensureRun\(\)/);
  assert.match(game,/function resetLevel\(\)/);
});

test('home quick tools are removed while Settings owns all three controls',()=>{
  const html=read('index.html');
  const game=read('js/game.js');
  const legacy=read('css/styles.css');
  const capsules=read('css/menu-capsules.css');
  const obsolete=/homeQuickTools|homeGuideBtn|homeMusicBtn|homeAmbientBtn|homeMusicState|homeAmbientState/;
  for(const [name,source] of [['index.html',html],['js/game.js',game],['css/styles.css',legacy],['css/menu-capsules.css',capsules]]){
    assert.doesNotMatch(source,obsolete,name+' retains removed quick tools');
  }
  for(const id of ['homeSettings','howPlaySettings','soundSwitch','musicSwitch','ambientSwitch']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  for(const hook of ["el('howPlaySettings').onclick","el('soundSwitch').onchange","el('musicSwitch').onchange","el('ambientSwitch').onchange"]){
    assert.ok(game.includes(hook),hook+' missing');
  }
});


test('Daily progress is integrated into the golden button as a lower map tier',()=>{
  const html=read('index.html');
  const game=read('js/game.js');
  const css=read('css/menu-capsules.css');
  const cardStart=html.indexOf('<div class="adventureCard" id="adventureCard">');
  const dailyStart=html.indexOf('id="playDaily"',cardStart);
  const dailyEnd=html.indexOf('</button>',dailyStart);
  const mapStart=html.indexOf('id="journeyQuick"',cardStart);
  const mapEnd=html.indexOf('</button>',mapStart);
  const cardEnd=html.indexOf('</div>',mapEnd);
  assert.ok(cardStart>=0&&dailyStart>cardStart&&dailyEnd<mapStart&&mapStart<mapEnd&&mapEnd<cardEnd,
    'Daily gameplay and map progress must be sibling buttons inside one capsule');
  const card=html.slice(cardStart,cardEnd);
  assert.match(card,/class="dailyProgressPanel"/);
  assert.match(card,/id="homeWeekDots"/);
  assert.match(card,/id="homeDay"/);
  assert.doesNotMatch(html,/id="homeChapter"|id="homeBar"|id="mysteryLine"|class="adventureCardTop"|id="chapterCard"/);
  assert.match(css,/#welcomeScreen \.adventureCard #journeyQuick\.dailyProgressPanel/);
  assert.match(css,/#welcomeScreen \.adventureCard \.dailyProgressPanel \.weekDots span\.complete/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(game,/el\('journeyQuick'\)\.setAttribute\('aria-label'/);
  assert.match(game,/for\(let day=1;day<=7;day\+\+\)/);
  assert.match(game,/el\('journeyQuick'\)\.onclick=\(\)=>showScreen\('journey'\)/);
  assert.match(game,/el\('playDaily'\)\.onclick=/);
});

test('home capsules share a narrower width and move up together without resizing the Daily map tier',()=>{
  const css=read('css/menu-capsules.css');
  assert.match(css,/--home-capsule-width:min\(calc\(100% - 64px\),360px\)/);
  assert.match(css,/--home-capsule-top:-52px/);
  assert.match(css,/#welcomeScreen \.adventureCard,\s*#welcomeScreen #playTreasure,\s*#welcomeScreen #openHideout\s*\{\s*width:var\(--home-capsule-width\)!important;\s*top:var\(--home-capsule-top\)!important;/);
  assert.match(css,/@media\(max-width:360px\)\{\s*#welcomeScreen\{--home-capsule-width:min\(calc\(100% - 36px\),360px\)/);
  assert.match(css,/@media\(max-height:700px\)\{\s*#welcomeScreen\{--home-capsule-top:-40px;/);
  assert.match(css,/@media\(max-height:520px\)\{\s*#welcomeScreen\{--home-capsule-top:-20px;/);
  // The upper and lower Daily actions remain independently clickable.
  const html=read('index.html');
  assert.match(html,/id="playDaily"/);
  assert.match(html,/id="journeyQuick"/);
  assert.match(html,/id="homeWeekDots"/);
});
