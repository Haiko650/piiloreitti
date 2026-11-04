'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const generator=require('../js/treasure-generator.js');
const solver=require('../js/treasure-solver.js');
const grading=require('../js/treasure-grading.js');
const progress=require('../js/treasure-progress.js');

const levels=generator.generateCampaign();
const seed=generator.DEFAULT_SEED,version=generator.VERSION;
const empty=()=>progress.empty(seed,version);
const optimal=level=>solver.solve(level).optimalMoves;
const complete=(p,i,extra=0)=>progress.recordCompletion(
  p,levels,i,optimal(levels[i])+extra,optimal(levels[i]),seed,version
);
test('new game unlocks level 1 only and has no pre-existing awards',()=>{
  const p=empty();
  assert.deepEqual(progress.validate(p,levels,seed,version,optimal),{valid:true,errors:[]});
  assert.equal(progress.completedCount(p,levels),0);
  assert.equal(progress.canEnter(p,levels,0),true);
  assert.equal(progress.canEnter(p,levels,1),false);
  assert.equal(progress.bestFor(p,levels[0]),null);
});
test('first clear unlocks exactly one new map and leaves the input untouched',()=>{
  const p=empty(),r=complete(p,0,3);
  assert.equal(r.firstClear,true);
  assert.equal(r.improved,true);
  assert.equal(r.previousBest,null);
  assert.equal(progress.completedCount(r.progress,levels),1);
  assert.equal(progress.canEnter(r.progress,levels,1),true);
  assert.equal(progress.canEnter(r.progress,levels,2),false);
  assert.equal(progress.completedCount(p,levels),0);
});
test('a worse or equal replay cannot replace the personal best',()=>{
  const r=complete(empty(),0,0);
  const worse=complete(r.progress,0,9);
  const equal=complete(r.progress,0,0);
  assert.equal(worse.improved,false);
  assert.equal(equal.improved,false);
  assert.equal(worse.progress,r.progress);
  assert.equal(equal.progress,r.progress);
  assert.equal(progress.bestFor(r.progress,levels[0]),optimal(levels[0]));
});
test('a better replay replaces only that level score and improves the fin grade',()=>{
  const r=complete(empty(),0,10);
  const newRecord=complete(r.progress,0,0);
  assert.equal(newRecord.firstClear,false);
  assert.equal(newRecord.improved,true);
  assert.equal(newRecord.previousBest,optimal(levels[0])+10);
  assert.equal(progress.bestFor(newRecord.progress,levels[0]),optimal(levels[0]));
  assert.equal(grading.rateMoves(newRecord.bestMoves,optimal(levels[0])).fins,3);
  assert.equal(progress.completedCount(newRecord.progress,levels),1);
});
test('locked levels cannot be marked completed out of order',()=>{
  assert.throws(()=>complete(empty(),1),/locked/);
  let p=complete(empty(),0).progress;
  assert.throws(()=>complete(p,2),/locked/);
  p=complete(p,1).progress;
  assert.equal(progress.canEnter(p,levels,2),true);
});
test('all 30 completed levels remain replayable, new content cannot overwrite old maps',()=>{
  let p=empty();
  for(let i=0;i<levels.length;i++)p=complete(p,i).progress;
  assert.equal(progress.completedCount(p,levels),30);
  assert.equal(progress.canEnter(p,levels,0),true);
  assert.equal(progress.canEnter(p,levels,29),true);
  assert.equal(progress.canEnter(p,levels,30),false);
  assert.deepEqual(progress.validate(p,levels,seed,version,optimal),{valid:true,errors:[]});
  assert.equal(Object.keys(p.records).length,30);
});
test('invalid or unknown save version, seed, corrupted record and gaps fail closed',()=>{
  const base=empty();
  const bad=[
    {...base,version:500},
    {...base,generatorVersion:999},
    {...base,seed:'different-seed'},
    {...base,records:{'unexpected-map':{bestMoves:2}}},
    {...base,records:{[levels[1].id]:{bestMoves:30}}},
    {...base,records:{[levels[0].id]:{bestMoves:0}}},
    {...base,records:{[levels[0].id]:{bestMoves:optimal(levels[0])-1}}},
    {...base,records:{[levels[0].id]:{bestMoves:20,untrusted:'garbage'}}}
  ];
  for(const record of bad)assert.equal(progress.validate(record,levels,seed,version,optimal).valid,false);
  assert.throws(()=>complete(bad[0],0),/invalid Treasure Hunt progress/i);
});
test('score smaller than exact solver optimum is rejected and cannot grant a medal',()=>{
  const opt=optimal(levels[0]);
  for(const score of [0,-1,opt-1,1.5,Infinity,'99',null])
    assert.throws(()=>progress.recordCompletion(empty(),levels,0,score,opt,seed,version),RangeError);
});
