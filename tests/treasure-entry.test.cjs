/* Regression for the former "stuck after level 3" problem.
 * Run with: node --test tests/treasure-entry.test.cjs
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=require('../js/treasure-engine.js');
const solver=require('../js/treasure-solver.js');
const grading=require('../js/treasure-grading.js');
const generator=require('../js/treasure-generator.js');
const progress=require('../js/treasure-progress.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));

function newSave(){
  return {schemaVersion:1,progress:{chapters:{'ocean-01':{testMarker:'daily-saved'}}},
    settings:{sound:true},collection:{items:{}},extensions:{}};
}
function element(id){
  const handlers=new Map(),children=[],classes=new Set();
  return {id,hidden:id==='thVictory'||id==='thCampaignError'||id==='thCampaignMap'||id==='thLeaveDialog',
    disabled:false,inert:false,textContent:'',className:'',dataset:{},style:{},children,
    classList:{add(x){classes.add(x)},remove(x){classes.delete(x)}},
    setAttribute(){},append(...x){children.push(...x)},
    replaceChildren(...x){children.splice(0,children.length,...x)},
    addEventListener(k,fn){const h=handlers.get(k)||[];h.push(fn);handlers.set(k,h)},
    focus(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},
    click(){for(const fn of handlers.get('click')||[])fn()}
  };
}
function harness(store={data:newSave(),writes:0}){
  const elements=new Map(),handlers=new Map();
  const $=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)};
  const selected=[];
  const document={getElementById:$,createElement:tag=>element(tag),
    createElementNS:(_ns,tag)=>element(tag),
    querySelector:s=>({'.th-shell':$('shell'),'.th-panel':$('panel')}[s]||null),
    addEventListener(k,fn){const a=handlers.get(k)||[];a.push(fn);handlers.set(k,a)},
    dispatchEvent(event){for(const fn of handlers.get(event.type)||[])fn(event)}
  };
  const root={
    PathleTreasureEngine:engine,PathleTreasureSolver:solver,
    PathleTreasureGenerator:generator,PathleTreasureGrading:grading,
    PathleTreasureProgress:progress,
    PathleSaveSchema:{createEmptySave:newSave},
    PathleStorage:{
      async load(){return {data:clone(store.data),revision:1,source:'current'}},
      async save(data){store.data=clone(data);store.writes++},
      async update(mutator){store.data=clone(mutator(clone(store.data)));store.writes++}
    },
    PathleTreasureUI:{
      selectLevel(i){selected.push(i);document.dispatchEvent({type:'pathle:treasure-level-change',detail:{levelId:root.PathleTreasureLevels[i].id}})},
      fitBoard(){},leaveLevel(){return true}
    }
  };
  // Legacy regression harness, deliberately not loaded by canonical URL.
  vm.runInNewContext(read('js/treasure-bootstrap.js'),{window:root});
  vm.runInNewContext(read('js/treasure-victory.js'),{window:root,document});
  vm.runInNewContext(read('js/treasure-campaign.js'),{window:root,document,requestAnimationFrame:fn=>fn()});
  return {root,document,$,store,selected};
}
const idle=()=>new Promise(resolve=>setImmediate(resolve));
function finished(level){
  let state=engine.createRun(level);
  for(const dest of solver.solve(level).path.slice(1)){
    const result=engine.applyAction(level,state,{type:'move',to:dest});
    assert.equal(result.accepted,true);
    state=result.state;
  }
  return state;
}

test('the canonical Treasure Hunt URL loads v2 tutorial and Water World (not retired 30 maps)',async()=>{
  const html=read('treasure-hunt.html'),home=read('index.html');
  assert.match(home,/id="playTreasure" href="treasure-hunt.html\?v=1\.5\.39"/);
  assert.match(html,/js\/treasure-bootstrap-v2\.js/);
  assert.match(html,/js\/treasure-campaign-v2\.js/);
  assert.match(html,/js\/treasure-worlds\.js/);
  assert.match(html,/id="thV2Tutorial"/);
  assert.match(html,/id="thV2World"/);
  assert.match(html,/id="thV2Area"/);
  assert.doesNotMatch(html,/src="js\/treasure-campaign\.js|src="js\/treasure-bootstrap\.js/);
  assert.doesNotMatch(html,/js\/treasure-preview.js|js\/treasure-levels.js|Select test level/);
  // Legacy controller is still exercised as an archived regression harness.
  const h=harness();await idle();
  assert.equal(h.root.PathleTreasureLevels.length,30);
  assert.equal(h.root.PathleTreasureCampaign.isReady(),true);
});

test('legacy TH.5 regression: completing old levels 1–3 still reaches old level 4',async()=>{
  const h=harness();await idle();
  const levels=h.root.PathleTreasureLevels;
  h.root.PathleTreasureCampaign.openLevel(0);
  for(let i=0;i<3;i++){
    const state=finished(levels[i]);
    h.document.dispatchEvent({type:'pathle:treasure-complete',detail:{level:levels[i],run:state,levelIndex:i}});
    await idle();
    assert.equal(h.$('thVictory').hidden,false,'Missing victory for level '+(i+1));
    assert.equal(h.$('thWinLevel').textContent,'LEVEL '+(i+1)+' / 30');
    assert.equal(h.$('thWinNext').hidden,false);
    h.$('thWinNext').click();
    assert.equal(h.$('thVictory').hidden,true);
    assert.equal(h.selected.at(-1),i+1,'Next did not open level '+(i+2));
  }
  assert.equal(h.selected.at(-1),3,'Level 4 is not selected');
  assert.equal(h.root.PathleTreasureCampaign.canEnter(3),true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(4),false);
  assert.equal(Object.keys(h.store.data.extensions.treasureHunt.records).length,3);
  assert.equal(h.store.data.progress.chapters['ocean-01'].testMarker,'daily-saved');
});

test('legacy TH.5 saves remain recoverable and are not erased by the new campaign',async()=>{
  const store={data:newSave(),writes:0};
  const levels=generator.generateCampaign();
  let saved=progress.empty(generator.DEFAULT_SEED,generator.VERSION);
  for(let i=0;i<3;i++){
    const optimal=solver.solve(levels[i]).optimalMoves;
    saved=progress.recordCompletion(saved,levels,i,optimal,optimal,generator.DEFAULT_SEED,generator.VERSION).progress;
  }
  store.data.extensions.treasureHunt=saved;
  const h=harness(store);await idle();
  assert.equal(h.root.PathleTreasureCampaign.canEnter(3),true);
  assert.equal(h.root.PathleTreasureCampaign.getBest(levels[2].id),solver.solve(levels[2]).optimalMoves);
  assert.equal(store.writes,0,'Opening the game must not overwrite valid saved progress');
});
