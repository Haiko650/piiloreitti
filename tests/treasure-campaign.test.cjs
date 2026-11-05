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
const model=require('../js/treasure-progress.js');

const levels=generator.generateCampaign();
const js=fs.readFileSync(path.join(__dirname,'../js/treasure-campaign.js'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function el(id){
  const events={};const children=[],classes=new Set();
  return {id,hidden:false,inert:false,disabled:false,className:'',children,dataset:{},style:{},attrs:{},isConnected:true,
    classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)}},
    addEventListener(name,cb){(events[name]??=[]).push(cb)},
    setAttribute(name,value){this.attrs[name]=value},
    replaceChildren(...items){children.splice(0,children.length,...items)},
    append(...items){children.push(...items)},
    focus(){this.focused=true},
    querySelector(){return null},
    scrollIntoView(){},
    click(){(events.click||[]).forEach(fn=>fn())}
  };
}
function baseSave(){
  return {schemaVersion:1,extensions:{},
    progress:{chapters:{'ocean-01':{protected:'daily'}}},
    settings:{sound:false,music:false},
    collection:{items:{luminous_pearl:true}},guides:{seen:{}}};
}
function makeStorage(start=baseSave()){
  const store={data:start===null?null:copy(start),writes:0,failWrites:0,failReads:0,
    async load(){
      if(this.failReads>0){this.failReads--;throw Error('Simulated load failure')}
      return this.data===null?null:{data:copy(this.data),revision:1,source:'current'};
    },
    async save(value){this.writes++;this.data=copy(value);return {revision:this.writes}},
    async update(fn){
      this.writes++;if(this.failWrites>0){this.failWrites--;throw Error('Simulated IndexedDB write failure')}
      this.data=copy(fn(copy(this.data)));return {revision:this.writes};
    }
  };return store;
}
function makePage(storage){
  const keys=['thCampaignMap','thMapRegions','thMapSummary','thMapReturn','thWinMap','thLeaveDialog','thLeaveStay','thLeaveConfirm','thCampaignError','thCampaignErrorTitle','thCampaignErrorText','thCampaignRetry','thVictory'];
  const elements=Object.fromEntries(keys.map(id=>[id,el(id)]));
  elements.thLeaveDialog.hidden=true;
  const special={'.th-shell':el('shell'),'.th-panel':el('panel'),'.th-level-tabs':el('tabs'),'.th-footnote':el('note')};
  const document={getElementById:id=>elements[id],querySelector:s=>special[s],
    createElement:tag=>el(tag),createElementNS:(_ns,tag)=>el(tag)};
  const chosen=[];
  let unfinished=false;
  const root={PathleTreasureCampaignMode:true,PathleTreasureLevels:levels,
    PathleTreasureGenerator:generator,PathleTreasureProgress:model,
    PathleTreasureSolver:solver,PathleTreasureGrading:grading,
    PathleTreasureEngine:engine,PathleStorage:storage,
    PathleSaveSchema:{createEmptySave:baseSave},
    PathleTreasureUI:{selectLevel:i=>chosen.push(i),fitBoard(){},leaveLevel(){return true},hasUnfinishedProgress:()=>unfinished}};
  vm.runInNewContext(js,{window:root,document,requestAnimationFrame:cb=>cb()},{filename:'treasure-campaign.js'});
  return {root,storage,elements,special,chosen,setUnfinished:value=>{unfinished=value}};
}
function optimalRun(level){
  const path=solver.solve(level).path;
  let state=engine.createRun(level);
  for(const to of path.slice(1))state=engine.applyAction(level,state,{type:'move',to}).state;
  return state;
}
const idle=()=>new Promise(resolve=>setImmediate(resolve));

test('campaign boots to 30-stop visual map with only first stage unlocked',async()=>{
  const p=makePage(makeStorage());await idle();
  assert.equal(p.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(p.elements.thCampaignMap.hidden,false);
  assert.equal(p.special['.th-panel'].hidden,true);
  assert.equal(p.elements.thMapRegions.children.length,3);
  assert.equal(p.root.PathleTreasureCampaign.canEnter(0),true);
  assert.equal(p.root.PathleTreasureCampaign.canEnter(1),false);
  p.root.PathleTreasureCampaign.openLevel(1);
  assert.deepEqual(p.chosen,[]);
  p.root.PathleTreasureCampaign.openLevel(0);
  assert.deepEqual(p.chosen,[0]);
});
test('a valid completion atomically saves only the Treasure extension',async()=>{
  const store=makeStorage();const p=makePage(store);await idle();
  const before=copy(store.data),run=optimalRun(levels[0]);let shown=null;
  await p.root.PathleTreasureCampaign.handleCompletion({level:levels[0],run,levelIndex:0},result=>{shown=result;});
  assert.equal(shown.firstClear,true);
  assert.equal(shown.improved,true);
  assert.equal(shown.bestMoves,engine.getScore(run));
  assert.equal(p.root.PathleTreasureCampaign.canEnter(1),true);
  assert.equal(store.data.extensions.treasureHunt.records[levels[0].id].bestMoves,shown.bestMoves);
  assert.deepEqual(store.data.progress,before.progress);
  assert.deepEqual(store.data.collection,before.collection);
  assert.deepEqual(store.data.settings,before.settings);
  assert.equal(store.writes,1);
});
test('progress survives reload, replays preserve best and do not write twice',async()=>{
  const store=makeStorage();let p=makePage(store);await idle();
  const run=optimalRun(levels[0]);
  await p.root.PathleTreasureCampaign.handleCompletion({level:levels[0],run,levelIndex:0},()=>{});
  p=makePage(store);await idle();
  assert.equal(p.root.PathleTreasureCampaign.canEnter(1),true);
  assert.equal(p.root.PathleTreasureCampaign.getBest(levels[0].id),engine.getScore(run));
  let result=null;
  await p.root.PathleTreasureCampaign.handleCompletion({level:levels[0],run,levelIndex:0},info=>{result=info;});
  assert.equal(result.firstClear,false);
  assert.equal(result.improved,false);
  assert.equal(store.writes,1);
});
test('write failure does not unlock until Retry Save succeeds',async()=>{
  const store=makeStorage();store.failWrites=1;
  const p=makePage(store);await idle();let victories=0;
  await p.root.PathleTreasureCampaign.handleCompletion({level:levels[0],run:optimalRun(levels[0]),levelIndex:0},()=>{victories++;});
  assert.equal(p.elements.thCampaignError.hidden,false);
  assert.equal(p.root.PathleTreasureCampaign.canEnter(1),false);
  assert.equal(store.data.extensions.treasureHunt,undefined);
  assert.equal(victories,0);
  await p.elements.thCampaignRetry.onclick();
  assert.equal(p.elements.thCampaignError.hidden,true);
  assert.equal(p.root.PathleTreasureCampaign.canEnter(1),true);
  assert.equal(victories,1);
});
test('corrupt or incompatible save fails closed and never resets daily progress',async()=>{
  const initial=baseSave();initial.extensions.treasureHunt={version:999};
  const store=makeStorage(initial);const p=makePage(store);await idle();
  assert.equal(p.root.PathleTreasureCampaign.isReady(),false);
  assert.equal(p.elements.thCampaignError.hidden,false);
  assert.equal(store.writes,0);
  assert.deepEqual(store.data,initial);
});
test('a direct Treasure Hunt visit creates a valid initial shared save once',async()=>{
  const store=makeStorage(null);const p=makePage(store);await idle();
  assert.equal(p.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(store.writes,1);
  assert.ok(store.data.progress.chapters['ocean-01']);
  assert.equal(p.root.PathleTreasureCampaign.canEnter(0),true);
});
test('temporary database read failure offers Retry and restores the map',async()=>{
  const store=makeStorage();store.failReads=1;
  const p=makePage(store);await idle();
  assert.equal(p.elements.thCampaignError.hidden,false);
  assert.equal(p.root.PathleTreasureCampaign.isReady(),false);
  await p.elements.thCampaignRetry.onclick();
  assert.equal(p.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(p.elements.thCampaignError.hidden,true);
});

test('map button asks before discarding an unfinished run and Keep playing preserves it',async()=>{
  const p=makePage(makeStorage());await idle();
  p.root.PathleTreasureCampaign.openLevel(0);
  p.setUnfinished(true);
  p.elements.thMapReturn.click();
  assert.equal(p.elements.thLeaveDialog.hidden,false);
  assert.equal(p.special['.th-shell'].inert,true);
  assert.equal(p.special['.th-panel'].hidden,false);
  p.elements.thLeaveStay.click();
  assert.equal(p.elements.thLeaveDialog.hidden,true);
  assert.equal(p.special['.th-shell'].inert,false);
  assert.equal(p.special['.th-panel'].hidden,false);
  assert.equal(p.storage.writes,0);
});
test('confirming Leave returns to map, but an untouched run needs no prompt',async()=>{
  const p=makePage(makeStorage());await idle();
  p.root.PathleTreasureCampaign.openLevel(0);
  p.elements.thMapReturn.click();
  assert.equal(p.elements.thLeaveDialog.hidden,true);
  assert.equal(p.elements.thCampaignMap.hidden,false);
  p.root.PathleTreasureCampaign.openLevel(0);
  p.setUnfinished(true);
  p.elements.thMapReturn.click();
  assert.equal(p.elements.thLeaveDialog.hidden,false);
  p.elements.thLeaveConfirm.click();
  assert.equal(p.elements.thLeaveDialog.hidden,true);
  assert.equal(p.elements.thCampaignMap.hidden,false);
  assert.equal(p.special['.th-panel'].hidden,true);
  assert.equal(p.storage.writes,0);
});

test('map totals earned fins without showing the optimum before clearing a level',async()=>{
  const p=makePage(makeStorage());await idle();
  assert.match(p.elements.thMapSummary.textContent,/Fins: 0 \/ 90/);
  const run=optimalRun(levels[0]);
  await p.root.PathleTreasureCampaign.handleCompletion(
    {level:levels[0],run,levelIndex:0},()=>{}
  );
  assert.match(p.elements.thMapSummary.textContent,/Fins: 3 \/ 90/);
  assert.match(p.elements.thMapSummary.textContent,/1 \/ 30 complete/);
  assert.doesNotMatch(p.elements.thMapSummary.textContent,/optimal|minimum moves/i);
});
