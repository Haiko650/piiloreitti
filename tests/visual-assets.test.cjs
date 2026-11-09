'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const visuals=require('../js/visual-assets.js');
const file=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('all required artwork slots are centralized and themes do not modify rules',()=>{
  for(const slot of ['water','coral','beach','forest','current','rock','wave','fin','start','goal','pearl','treasure','haikoPeek']){
    assert.ok(visuals.ASSET_KEYS.includes(slot),'missing '+slot);
    assert.equal(visuals.getAsset(slot,'coast'),slot==='fin'?'images/skins/haiko-fin.webp':null);
  }
  for(const theme of ['coral-reef','coast','ocean','river','forest'])assert.ok(visuals.ART.environments[theme]);
  assert.equal(visuals.getAsset('invalid-key','ocean'),null);
});

test('cosmetic terrain cannot silently change blocked cell rules',()=>{
  const board={visualTerrain:{3:'forest',5:'current',7:'beach',9:'rock'}};
  assert.equal(visuals.terrainFor(board,3,true),'forest');
  assert.equal(visuals.terrainFor(board,5,false),'current');
  assert.equal(visuals.terrainFor(board,7,false),'beach');
  assert.equal(visuals.terrainFor(board,9,true),'rock');
  assert.equal(visuals.terrainFor(board,11,true),'coral');
  assert.equal(visuals.terrainFor(board,12,false),'water');
  assert.equal(visuals.terrainFor({visualTerrain:{4:'INVALID'}},4,true),'coral');
});

test('shared Haiko fin replaces the fallback while other absent artwork retains SVG/CSS',()=>{
  for(const theme of ['coral-reef','coast','ocean']) {
    assert.match(visuals.sprite('fin',theme,'<svg>fin</svg>'),/images\/skins\/haiko-fin\.webp/);
  }
  const image=fs.readFileSync(path.join(__dirname,'..','images/skins/haiko-fin.webp'));
  assert.equal(image.toString('ascii',0,4),'RIFF');
  assert.equal(image.toString('ascii',8,12),'WEBP');
  assert.equal(visuals.sprite('treasure','coast','<svg>pearl</svg>'),'<svg>pearl</svg>');
  const classes=new Set();
  const board={classList:{add(x){classes.add(x);},toggle(x,enabled){if(enabled)classes.add(x);else classes.delete(x);}},
    dataset:{},style:{props:{},setProperty(k,v){this.props[k]=v;}}};
  visuals.applyBoard(board,'ocean');
  assert.equal(board.dataset.artEnvironment,'ocean');
  assert.equal(board.style.props['--pa-water'],'none');
  assert.equal(board.style.props['--pa-fin'],'url("images/skins/haiko-fin.webp")');
  assert.ok(classes.has('pa-board'));
  assert.ok(classes.has('pa-has-fin'));
});

test('tile decoration records visual terrain separately from gameplay',()=>{
  const tile={dataset:{}};
  visuals.decorateTile(tile,'forest','start','coast');
  assert.equal(tile.dataset.terrain,'forest');
  assert.equal(tile.dataset.artFeature,'start');
  visuals.decorateTile(tile,'water',null,'ocean');
  assert.equal(tile.dataset.terrain,'water');
  assert.equal(tile.dataset.artFeature,undefined);
  assert.throws(()=>visuals.decorateTile(tile,'lava',null,'coast'),/Unknown visual terrain/);
});

test('both pages load their visual scripts before their UI and skin CSS after fallback',()=>{
  const daily=file('index.html'),treasure=file('treasure-hunt.html');
  assert.ok(daily.indexOf('css/visual-assets.css')>daily.indexOf('css/styles.css'));
  assert.ok(treasure.indexOf('css/visual-assets.css')>treasure.indexOf('css/treasure.css'));
  assert.ok(daily.indexOf('js/visual-assets.js')<daily.indexOf('js/game.js'));
  assert.ok(treasure.indexOf('js/visual-assets.js')<treasure.indexOf('js/treasure-ui.js'));
  assert.match(file('js/game.js'),/visualAssets\.applyBoard\(board,'coral-reef'\)/);
  assert.match(file('js/treasure-ui.js'),/visualAssets\.applyBoard\(board,level\.environment\)/);
});

function mockPeek(){
  // Inject a fake artwork path into an in-memory copy; the real catalog
  // intentionally remains empty until the approved artwork is supplied.
  const source=file('js/visual-assets.js').replace('haikoPeek:null', "haikoPeek:'images/skins/haiko-peek.webp'");
  const listeners=new Map(),timers=new Map(),children=[];
  let nextId=0;
  const root={isConnected:true,classList:{members:new Set(),
    add(v){this.members.add(v);},remove(v){this.members.delete(v);}},
    append(el){el.parentElement=root;children.push(el);}
  };
  const document={hidden:false,
    addEventListener(name,cb){listeners.set(name,cb);},
    removeEventListener(name){listeners.delete(name);},
    createElement(){return {style:{},parentElement:null,
      setAttribute(){},addEventListener(name,cb){this.onAnimationEnd=name==='animationend'?cb:null;},
      remove(){const i=children.indexOf(this);if(i!==-1)children.splice(i,1);}
    };}
  };
  const module={exports:{}};
  const context={module,document,window:{},setTimeout(fn,ms){
    const id=++nextId;timers.set(id,{fn,ms});return id;
  },clearTimeout(id){timers.delete(id);},matchMedia(){return {matches:false};}};
  vm.runInNewContext(source,context,{filename:'visual-assets.js'});
  const idle=module.exports.createIdlePeek({theme:()=> 'coast',anchor:()=>root,canShow:()=>true});
  return {idle,root,document,children,listeners,timers,fire(){
    const [id,timer]=timers.entries().next().value;
    timers.delete(id);timer.fn();return timer.ms;
  }};
}

test('idle Haiko waits 3s and appears as a separate non-interactive element',()=>{
  const h=mockPeek();
  h.idle.reset();
  assert.equal(h.timers.size,1);
  assert.equal(h.fire(),3000);
  assert.equal(h.children.length,1);
  assert.equal(h.children[0].className,'pa-idle-haiko');
  assert.equal(h.children[0].style.backgroundImage,'url("images/skins/haiko-peek.webp")');
  h.idle.cancel();
  assert.equal(h.children.length,0);
  assert.equal(h.root.classList.members.has('pa-peek-anchor'),false);
  h.idle.dispose();
});

test('idle peek is cancelled by hidden tabs, and does not outlive level cleanup',()=>{
  const h=mockPeek();
  h.idle.reset();
  h.document.hidden=true;h.listeners.get('visibilitychange')();
  assert.equal(h.timers.size,0);
  h.document.hidden=false;h.listeners.get('visibilitychange')();
  assert.equal(h.timers.size,1);
  h.idle.dispose();
  assert.equal(h.timers.size,0);
  assert.equal(h.listeners.size,0);
});
