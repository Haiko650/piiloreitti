'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../js/treasure-worlds.js');
const progress=require('../js/treasure-progress-v2.js');
const engine=require('../js/treasure-engine.js');
const solver=require('../js/treasure-solver.js');
const legacy=require('../js/treasure-progress.js');

const clone=o=>JSON.parse(JSON.stringify(o));
const base=()=>clone(catalog.DEFAULT_CATALOG);
const grade=(id,moves)=>moves===4?3:1;
const fill=(area,n)=>Array.from({length:n},(_,i)=>'th-'+area+'-'+String(i+1).padStart(3,'0'));
function releaseArea(manifest,id,count){
  const a=manifest.areas.find(x=>x.id===id);
  a.status='released';
  a.levelIds=fill(id,count);
  return a;
}
function clearTutorial(state,manifest){
  let p=state;
  for(const level of catalog.TUTORIAL_LEVELS){
    const opt=solver.solve(level).optimalMoves;
    p=progress.recordBest(p,manifest,level.id,opt,opt,grade).progress;
  }
  return p;
}

test('TH.6A catalog has one expandable Water World and a future Space Adventure',()=>{
  const c=catalog.DEFAULT_CATALOG;
  assert.equal(catalog.validate(c).valid,true);
  assert.equal(catalog.getWorld(c,'water-world').status,'active');
  assert.equal(catalog.getWorld(c,'space-adventure').status,'future');
  assert.equal(catalog.getAreas(c,'water-world').length,3);
  assert.ok(c.areas.every(area=>area.targetLevelCount===60&&area.levelIds.length===0));
  assert.deepEqual(catalog.playableIds(c),c.tutorial.levelIds);
  assert.equal(catalog.getStage(c,'th-tutorial-001').areaId,'tutorial');
});

test('three new fixed tutorial boards are legal, solvable and have unique new IDs',()=>{
  const ids=new Set();
  for(const level of catalog.TUTORIAL_LEVELS){
    assert.equal(engine.validateLevel(level).valid,true,level.id);
    assert.ok(solver.solve(level).optimalMoves>0);
    assert.ok(!ids.has(level.id));
    ids.add(level.id);
    assert.ok(!level.id.startsWith('thg1-'));
  }
  assert.deepEqual(catalog.TUTORIAL_LESSONS.map(l=>l.topic),[
    'movement','multiple-treasures','obstacles-and-fins']);
});

test('area counts can exceed 60 without hardcoded blocks of 10',()=>{
  const c=base();
  releaseArea(c,'coral-coast',60);
  assert.equal(catalog.validate(c).valid,true);
  assert.equal(catalog.playableIds(c).length,63);
  c.areas[0].targetLevelCount=120;
  c.areas[0].levelIds=fill('coral-coast',120);
  assert.equal(catalog.validate(c).valid,true);
  assert.equal(catalog.playableIds(c).length,123);
  c.worlds.push({id:'underwater-moon',title:'Underwater Moon',sort:3,status:'future'});
  c.areas.push({
    id:'moon-lagoon',title:'Moon Lagoon',worldId:'underwater-moon',sort:1,
    status:'planned',targetLevelCount:85,levelIds:[],
    unlock:{afterAreaId:'tutorial',minimumFins:0},
    map:{mode:'vertical-scroll'},visualMode:'underwater'
  });
  assert.equal(catalog.validate(c).valid,true);
  assert.equal(catalog.getAreas(c,'underwater-moon')[0].targetLevelCount,85);
});

test('invalid duplicate region IDs and invalid backwards unlock chains are rejected',()=>{
  const c=base();c.areas.push({...c.areas[0]});
  assert.equal(catalog.validate(c).valid,false);
  const bad=base();
  bad.areas[0].unlock.afterAreaId='open-ocean';
  assert.equal(catalog.validate(bad).valid,false);
  const fake=base();
  fake.areas[1].levelIds=['th-tutorial-001'];
  assert.equal(catalog.validate(fake).valid,false);
});

test('new progress starts with only tutorial 1 accessible',()=>{
  const c=base(),p=progress.empty();
  assert.deepEqual(progress.validate(p,c),{valid:true,errors:[]});
  assert.equal(progress.canPlay(p,c,'th-tutorial-001'),true);
  assert.equal(progress.canPlay(p,c,'th-tutorial-002'),false);
  assert.equal(progress.canPlay(p,c,'th-tutorial-003'),false);
  assert.equal(progress.areaAccess(p,c,'coral-coast').reason,'unpublished');
});

test('tutorial unlocks sequentially and then unlocks first released area',()=>{
  const c=base();releaseArea(c,'coral-coast',2);
  let p=progress.empty();
  assert.equal(progress.areaAccess(p,c,'coral-coast').reason,'previous-area-incomplete');
  const one=c.tutorial.levelIds[0],two=c.tutorial.levelIds[1];
  const first=progress.recordBest(p,c,one,7,6,grade);
  p=first.progress;
  assert.equal(first.firstClear,true);
  assert.equal(progress.canPlay(p,c,two),true);
  assert.equal(progress.canPlay(p,c,'th-tutorial-003'),false);
  assert.equal(progress.canPlay(p,c,'th-coral-coast-001'),false);
  // Better scores improve, worse ones are ignored.
  assert.strictEqual(progress.recordBest(p,c,one,9,6,grade).progress,p);
  assert.equal(progress.recordBest(p,c,one,6,6,grade).progress.records[one].bestMoves,6);
  const tutorialDone=clearTutorial(p,c);
  assert.equal(tutorialDone.unlockedAreas.includes('coral-coast'),true);
  assert.equal(progress.canPlay(tutorialDone,c,'th-coral-coast-001'),true);
  assert.equal(progress.canPlay(tutorialDone,c,'th-coral-coast-002'),false);
});

test('new area can require 120 fins; improving old levels can satisfy gate',()=>{
  const c=base();const coast=releaseArea(c,'coral-coast',60);
  const islands=releaseArea(c,'tropical-islands',1);
  islands.unlock.minimumFins=120;
  let p=clearTutorial(progress.empty(),c);
  for(const id of coast.levelIds){
    p=progress.recordBest(p,c,id,6,4,grade).progress;
  }
  assert.equal(progress.areaAccess(p,c,islands.id,grade).reason,'insufficient-fins');
  assert.equal(progress.canPlay(p,c,islands.levelIds[0],grade),false);
  for(const id of coast.levelIds.slice(0,30)){
    p=progress.recordBest(p,c,id,4,4,grade).progress;
  }
  assert.equal(progress.earnedFins(p,coast.levelIds,grade),120);
  assert.equal(progress.canPlay(p,c,islands.levelIds[0],grade),true);
  assert.ok(p.unlockedAreas.includes(islands.id));
  // Requirements may become stricter, but a saved unlock remains valid.
  const revised=clone(c);
  revised.areas[1].unlock.minimumFins=180;
  assert.equal(progress.areaAccess(p,revised,islands.id,grade).reason,'previously-unlocked');
  assert.equal(progress.canPlay(p,revised,islands.levelIds[0],grade),true);
});

test('old v1 Treasure Hunt data and Daily Challenge data stay untouched',()=>{
  const oldRecord=legacy.empty('legacy-seed',1);
  const shared={
    progress:{chapters:{'ocean-01':{completedDays:4}}},
    collection:{items:{luminous_pearl:true}},
    extensions:{treasureHunt:oldRecord}
  };
  const before=clone(shared);
  const c=base();
  const current=progress.recordBest(progress.empty(),c,'th-tutorial-001',6,6,grade);
  shared.extensions[progress.KEY]=current.progress;
  assert.deepEqual(shared.extensions.treasureHunt,before.extensions.treasureHunt);
  assert.deepEqual(shared.progress,before.progress);
  assert.deepEqual(shared.collection,before.collection);
  assert.equal(progress.KEY,'treasureHuntV2');
});

test('bad new scores, gaps, unknown IDs and invalid fin awards fail closed',()=>{
  const c=base(),first=c.tutorial.levelIds[0];
  for(const score of [0,1.5,Infinity,-1,3])
    assert.throws(()=>progress.recordBest(progress.empty(),c,first,score,4),RangeError);
  assert.throws(()=>progress.recordBest(progress.empty(),c,c.tutorial.levelIds[2],6,5),/locked/);
  assert.equal(progress.validate({...progress.empty(),records:{'thg1-7269b58f-00001':{bestMoves:4}}},c).valid,false);
  assert.equal(progress.validate({...progress.empty(),records:{[c.tutorial.levelIds[1]]:{bestMoves:4}}},c).valid,false);
  assert.equal(progress.validate({...progress.empty(),unlockedAreas:['unknown']},c).valid,false);
  const published=base();releaseArea(published,'coral-coast',1);
  const finished=clearTutorial(progress.empty(),published);
  assert.throws(()=>progress.earnedFins(finished,[first],()=>5),RangeError);
});
