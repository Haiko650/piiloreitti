'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=require('../js/treasure-engine.js');
const solver=require('../js/treasure-solver.js');
const grading=require('../js/treasure-grading.js');
const worlds=require('../js/treasure-worlds.js');
const release=require('../js/treasure-release-v2.js');
const model=require('../js/treasure-progress-v2.js');
const saver=require('../js/treasure-save-v2.js');
const art=require('../js/treasure-map-art.js');
const source=fs.readFileSync(path.join(__dirname,'../js/treasure-campaign-v2.js'),'utf8');
const clone=o=>JSON.parse(JSON.stringify(o));
const idle=()=>new Promise(resolve=>setImmediate(resolve));
function element(id){
  const events={},children=[],classes=new Set(),properties={};
  const item={
    id,children,events,properties,inert:false,disabled:false,hidden:true,
    textContent:'',dataset:{},
    style:{setProperty(name,value){properties[name]=value}},
    classList:{
      add(c){classes.add(c)},remove(c){classes.delete(c)},
      contains(c){return classes.has(c)||item.className.split(/\s+/).includes(c)}
    },
    setAttribute(name,value){this[name]=value},
    append(...more){children.push(...more)},
    replaceChildren(...more){children.splice(0,children.length,...more)},
    addEventListener(name,fn){(events[name]??=[]).push(fn)},
    focus(){this.wasFocused=true},
    scrollIntoView(){this.wasScrolled=true},
    querySelector(selector){
      if(selector==='.is-next')return children.find(c=>c.classList?.contains('is-next'))||null;
      if(selector.includes('.is-complete'))return children.slice().reverse().find(c=>c.classList?.contains('is-complete'))||null;
      return null;
    },
    click(){for(const fn of events.click??[])fn({target:this})}
  };
  return item;
}
function storage(saved){
  return {
    data:saved===null?null:clone(saved),writes:0,failWrites:0,
    async load(){return this.data===null?null:{data:clone(this.data),revision:1}},
    async save(value){this.data=clone(value);this.writes++;},
    async update(fn){
      this.writes++;
      if(this.failWrites){this.failWrites--;throw Error('Simulated IndexedDB write failure');}
      this.data=clone(fn(clone(this.data)));
    }
  };
}
const original=()=>({schemaVersion:1,extensions:{
  treasureHunt:{version:1,seed:'old-campaign',generatorVersion:1,records:{}}
},progress:{chapters:{'ocean-01':{dailyMarker:'preserve'}}},
settings:{sound:true},collection:{items:{luminous_pearl:true}}});
function harness(initial=original()){
  const elements=new Map(),storageInstance=storage(initial),selected=[];
  const $=id=>{
    if(!elements.has(id))elements.set(id,element(id));
    return elements.get(id);
  };
  const document={
    getElementById:$,createElement:tag=>element(tag),
    createElementNS:(_ns,tag)=>element(tag),
    querySelector:s=>({'.th-shell':$('shell'),'.th-panel':$('panel')}[s]||null),
    body:{dataset:{}}
  };
  $('thLeaveDialog').hidden=true;
  $('thCampaignError').hidden=true;
  $('thVictory').hidden=true;
  const root={
    PathleTreasureCampaignV2:true,PathleTreasureReleaseV2:release,
    PathleTreasureWorlds:worlds,PathleTreasureProgressV2:model,
    PathleTreasureSaveV2:saver,PathleTreasureGrading:grading,
    PathleTreasureSolver:solver,PathleTreasureEngine:engine,
    PathleTreasureUI:{
      selectLevel:i=>selected.push(i),fitBoard(){},
      leaveLevel(){return true},hasUnfinishedProgress:()=>false
    },
    PathleStorage:storageInstance,PathleTreasureMapArt:art,
    PathleSaveSchema:{createEmptySave:()=>({
      schemaVersion:1,extensions:{},progress:{chapters:{}},
      collection:{items:{}},settings:{sound:true}
    })}
  };
  vm.runInNewContext(source,{window:root,document,requestAnimationFrame:fn=>fn()});
  return {root,storage:storageInstance,$,selected,document};
}
function completedRun(level){
  let run=engine.createRun(level);
  for(const to of solver.solve(level).path.slice(1))
    run=engine.applyAction(level,run,{type:'move',to}).state;
  assert.equal(run.completed,true);
  return run;
}
async function clear(h,index){
  const level=release.levels[index];
  h.root.PathleTreasureCampaign.openLevel(index);
  let shown;
  await h.root.PathleTreasureCampaign.handleCompletion(
    {level,run:completedRun(level),levelIndex:index},
    details=>{shown=details;});
  assert.ok(shown,'No victory after level '+index);
  return shown;
}

test('TH.6A.2 starts with tutorial rather than old thirty-map campaign',async()=>{
  const h=harness();await idle();
  assert.equal(h.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'tutorial');
  assert.equal(h.$('thV2Tutorial').hidden,false);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(0),true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(1),false);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(3),false);
  assert.equal(h.storage.writes,0);
  h.$('thV2TutorialStart').click();
  assert.deepEqual(h.selected,[0]);
});

test('three tutorial finishes unlock Water World and first Coral Coast stage',async()=>{
  const h=harness();await idle();
  for(let i=0;i<3;i++){
    const record=await clear(h,i);
    assert.equal(record.firstClear,true);
    assert.equal(record.bestMoves,solver.solve(release.levels[i]).optimalMoves);
  }
  assert.equal(h.root.PathleTreasureCampaign.canEnter(3),true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(4),false);
  h.root.PathleTreasureCampaign.advance(2,3);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'world');
  assert.equal(h.$('thV2World').hidden,false);
  const pins=h.$('thV2WorldPins').children;
  assert.equal(pins.length,3);
  assert.equal(pins[0].disabled,false);
  assert.equal(pins[1].disabled,true);
  assert.ok(h.$('thV2WorldCanvas').properties['--th-world-art'].includes('world-overview.svg'));
  pins[0].click();
  assert.equal(h.root.PathleTreasureCampaign.getView(),'area');
  const area=h.$('thV2AreaCanvas');
  assert.equal(area.children.filter(x=>x.classList.contains('th-v2-node')).length,4);
  assert.ok(area.properties['--th-base-art'].includes('section-01-base.svg'));
  assert.ok(area.properties['--th-detail-art'].includes('section-01-details.svg'));
  assert.equal(area.children.filter(x=>x.classList.contains('th-v2-map-haiko')).length,1);
  const first=area.children.find(x=>x.classList.contains('is-next'));
  first.click();
  assert.equal(h.selected.at(-1),3);
  assert.deepEqual(h.storage.data.progress.chapters['ocean-01'],{dailyMarker:'preserve'});
  assert.equal(h.storage.data.extensions.treasureHunt.seed,'old-campaign');
  assert.equal(Object.keys(h.storage.data.extensions.treasureHuntV2.records).length,3);
});

test('Coral Coast current stage changes only after a successful saved victory',async()=>{
  const h=harness();await idle();
  for(let i=0;i<3;i++)await clear(h,i);
  h.root.PathleTreasureCampaign.advance(2,3);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  await clear(h,3);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  const area=h.$('thV2AreaCanvas');
  const next=area.children.find(x=>x.classList.contains('is-next'));
  assert.equal(next.children[0].textContent,'2');
  assert.equal(h.root.PathleTreasureCampaign.canEnter(4),true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(5),false);
});

test('write failure blocks unlock; Retry Save restores controller and score',async()=>{
  const h=harness();await idle();
  h.storage.failWrites=1;
  let victories=0;
  const level=release.levels[0];
  await h.root.PathleTreasureCampaign.handleCompletion(
    {level,run:completedRun(level),levelIndex:0},()=>{victories++});
  assert.equal(victories,0);
  assert.equal(h.root.PathleTreasureCampaign.isReady(),false);
  assert.equal(h.$('thCampaignError').hidden,false);
  assert.equal(h.storage.data.extensions.treasureHuntV2,undefined);
  await h.$('thCampaignRetry').onclick();
  assert.equal(h.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(h.$('thCampaignError').hidden,true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(1),true);
  assert.equal(victories,1);
});

test('a reload preserves tutorial unlocks and does not copy old bests',async()=>{
  const h=harness();await idle();await clear(h,0);
  const h2=harness(h.storage.data);await idle();
  assert.equal(h2.root.PathleTreasureCampaign.getView(),'tutorial');
  assert.equal(h2.root.PathleTreasureCampaign.canEnter(1),true);
  assert.equal(h2.root.PathleTreasureCampaign.canEnter(3),false);
  assert.equal(h2.storage.writes,0);
});

test('new visitor without shared DB gets one safe initialized record',async()=>{
  const h=harness(null);await idle();
  assert.equal(h.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(h.storage.writes,1);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'tutorial');
});
