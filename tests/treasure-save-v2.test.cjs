'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const worlds=require('../js/treasure-worlds.js');
const model=require('../js/treasure-progress-v2.js');
const adapter=require('../js/treasure-save-v2.js');
const clone=v=>JSON.parse(JSON.stringify(v));
function fakeStorage(initial){
  return {
    data:initial===null?null:clone(initial),reads:0,writes:0,failWrites:0,
    async load(){this.reads++;return this.data===null?null:{data:clone(this.data)};},
    async update(fn){
      this.writes++;
      if(this.failWrites>0){this.failWrites--;throw Error('Simulated failed write');}
      const draft=clone(this.data);
      const next=fn(draft);
      assert.equal(next instanceof Promise,false);
      this.data=clone(next);
      return {revision:this.writes};
    }
  };
}
const oldSave=()=>({
  schemaVersion:1,
  progress:{chapters:{'ocean-01':{completedDays:3,marker:'daily'}}},
  collection:{items:{luminous_pearl:true}},
  settings:{sound:true,music:false,ambient:true},
  extensions:{treasureHunt:{version:1,seed:'old',generatorVersion:1,
    records:{'thg1-7269b58f-00001':{bestMoves:22}}}}
});

test('v2 adapter is lazy; accessing module cannot modify or create saves',async()=>{
  const s=fakeStorage(oldSave());
  assert.equal(s.reads,0);
  assert.equal(s.writes,0);
  const result=await adapter.load(s,worlds.DEFAULT_CATALOG);
  assert.equal(s.reads,1);
  assert.equal(s.writes,0);
  assert.deepEqual(result.progress,model.empty());
  assert.equal(result.needsInitialSave,false);
});

test('first-ever player has an empty preview without implicit write',async()=>{
  const s=fakeStorage(null);
  const result=await adapter.load(s,worlds.DEFAULT_CATALOG);
  assert.deepEqual(result.progress,model.empty());
  assert.equal(result.needsInitialSave,true);
  assert.equal(s.writes,0);
});

test('first tutorial clear writes only v2 extension and keeps old saves exactly',async()=>{
  const s=fakeStorage(oldSave());
  const before=clone(s.data);
  const result=await adapter.commitBest(s,worlds.DEFAULT_CATALOG,
    'th-tutorial-001',6,6,()=>3);
  assert.equal(result.firstClear,true);
  assert.equal(s.writes,1);
  assert.deepEqual(s.data.progress,before.progress);
  assert.deepEqual(s.data.collection,before.collection);
  assert.deepEqual(s.data.settings,before.settings);
  assert.deepEqual(s.data.extensions.treasureHunt,before.extensions.treasureHunt);
  assert.equal(s.data.extensions.treasureHuntV2.records['th-tutorial-001'].bestMoves,6);
});

test('reopening reads v2 progress without reading legacy v1 as campaign 2',async()=>{
  const s=fakeStorage(oldSave());
  await adapter.commitBest(s,worlds.DEFAULT_CATALOG,'th-tutorial-001',6,6);
  const reopened=await adapter.load(s,worlds.DEFAULT_CATALOG);
  assert.equal(model.canPlay(reopened.progress,worlds.DEFAULT_CATALOG,'th-tutorial-002'),true);
  assert.equal(Object.keys(reopened.progress.records).length,1);
});

test('corrupt v2 progress is never erased, and failed writes leave shared state intact',async()=>{
  const bad=oldSave();
  bad.extensions.treasureHuntV2={version:50,records:{}};
  const s=fakeStorage(bad);
  assert.rejects(adapter.load(s,worlds.DEFAULT_CATALOG),/invalid Treasure Hunt v2/);
  await assert.rejects(adapter.commitBest(s,worlds.DEFAULT_CATALOG,
    'th-tutorial-001',6,6),/invalid Treasure Hunt v2/);
  assert.deepEqual(s.data,bad);
  const ok=fakeStorage(oldSave());
  const before=clone(ok.data);
  ok.failWrites=1;
  await assert.rejects(adapter.commitBest(ok,worlds.DEFAULT_CATALOG,'th-tutorial-001',6,6),/failed write/);
  assert.deepEqual(ok.data,before);
});
