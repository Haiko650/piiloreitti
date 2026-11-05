'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const generator=require('../js/treasure-generator.js');
const solver=require('../js/treasure-solver.js');
const engine=require('../js/treasure-engine.js');

function layoutFingerprint(levels){
  // FNV-1a over the serialized, ordered geometry and stable level IDs.
  // If this value changes, a previously published map was altered and
  // old best scores may no longer describe the same puzzle.
  const json=JSON.stringify(levels);
  let hash=2166136261;
  for(let i=0;i<json.length;i++){
    hash^=json.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}

test('the first thirty published maps retain exactly their original version-one layouts',()=>{
  const maps=generator.generateCampaign(30);
  assert.equal(layoutFingerprint(maps),'5e2bc459');
  assert.equal(maps[0].id,'thg1-7269b58f-00001');
  assert.equal(maps[29].id,'thg1-7269b58f-00030');
  assert.deepEqual(maps, generator.generateCampaign(100).slice(0,30));
});

test('existing three regions increase in average puzzle length, without unfinishable maps',()=>{
  const maps=generator.generateCampaign(30);
  const averages=[];
  for(let region=0;region<3;region++){
    const part=maps.slice(region*10,region*10+10);
    const lengths=part.map(level=>{
      assert.equal(engine.validateLevel(level).valid,true);
      const solution=solver.solve(level);
      assert.ok(solution.optimalMoves>0&&solution.optimalMoves<=100);
      return solution.optimalMoves;
    });
    averages.push(lengths.reduce((a,b)=>a+b,0)/lengths.length);
  }
  assert.deepEqual(averages,[18.1,31.4,44.4]);
});

test('do not reveal exact optimal moves in the player-facing map',()=>{
  // Exact optimal moves are reserved for the victory dialog, not the map.
  const fs=require('node:fs');
  const path=require('node:path');
  const mapSource=fs.readFileSync(path.join(__dirname,'../js/treasure-campaign.js'),'utf8');
  const body=mapSource.slice(mapSource.indexOf('function paintMap()'),mapSource.indexOf('function showMap()'));
  assert.ok(!body.includes('optimalMoves'));
  assert.ok(body.includes('medalName(best,level)'));
});
