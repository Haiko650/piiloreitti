/* TH.4A – run with: node --test tests/*.test.cjs */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=require('../js/treasure-engine.js');
const solver=require('../js/treasure-solver.js');
const generator=require('../js/treasure-generator.js');
const legacy=require('../js/treasure-levels.js');

const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function replay(level,path){
  let run=engine.createRun(level);
  assert.equal(path[0],level.start);
  assert.equal(path.at(-1),level.goal);
  for(const tile of path.slice(1)){
    const next=engine.applyAction(level,run,{type:'move',to:tile});
    assert.equal(next.accepted,true,level.id+': illegal move '+run.position+' -> '+tile);
    run=next.state;
  }
  assert.equal(run.completed,true);
  assert.equal(run.collected.length,level.treasures.length);
  assert.equal(engine.getScore(run),path.length-1);
}
test('TH.4A produces 30 varied playable maps while keeping the old three tests unchanged',()=>{
  const copy=JSON.stringify(legacy);
  const levels=generator.generateCampaign();
  assert.equal(levels.length,30);
  assert.deepEqual(levels.slice(0,10).map(l=>[l.width,l.height]).every(x=>x.join()===['6','8'].join()),true);
  assert.ok(levels.slice(10,20).every(l=>l.width===8&&l.height===12&&l.environment==='ocean'));
  assert.ok(levels.slice(20,30).every(l=>l.width===10&&l.height===15&&l.environment==='river'));
  assert.equal(new Set(levels.map(l=>l.id)).size,30);
  assert.equal(new Set(levels.map(l=>l.start)).size>12,true);
  assert.equal(new Set(levels.map(l=>l.goal)).size>12,true);
  assert.equal(JSON.stringify(legacy),copy);
  assert.deepEqual(legacy.map(l=>[l.width,l.height]),[[6,8],[8,12],[10,15]]);
});
test('every generated level validates and has an exact, replayable shortest route',()=>{
  for(const level of generator.generateCampaign()){
    assert.deepEqual(engine.validateLevel(level),{valid:true,errors:[]},level.id);
    assert.notEqual(level.start,level.goal);
    assert.ok(level.treasures.length>=2&&level.treasures.length<=5);
    assert.deepEqual(level.effects,[]);
    const answer=solver.solve(level);
    assert.ok(answer.optimalMoves>=10 && answer.optimalMoves<100,level.id);
    assert.equal(answer.path.length-1,answer.optimalMoves);
    replay(level,answer.path);
  }
});
test('stable seed and index are independent of generation order and campaign size',()=>{
  const first=generator.generateCampaign(30);
  const again=generator.generateCampaign(30);
  assert.deepEqual(first,again);
  assert.deepEqual(first[16],generator.generateLevel(17));
  assert.deepEqual(first.slice(0,7),generator.generateCampaign(7));
  assert.notDeepEqual(generator.generateLevel(3,'another-legal-campaign'),first[2]);
  assert.equal(generator.generateLevel(3,'another-legal-campaign').id,
    generator.generateLevel(3,'another-legal-campaign').id);
});
test('campaign expansion to 100 maps cannot change the first 30',()=>{
  const first=generator.generateCampaign(30);
  const expanded=generator.generateCampaign(100);
  assert.deepEqual(expanded.slice(0,30),first);
  assert.equal(new Set(expanded.map(l=>l.id)).size,100);
  for(const level of expanded){
    assert.equal(engine.validateLevel(level).valid,true,level.id);
    const result=solver.solve(level);
    assert.ok(result.optimalMoves>0,level.id);
  }
});
test('generator does not mutate previously generated board data',()=>{
  const board=generator.generateLevel(5),snap=JSON.stringify(board);
  board.blocked.splice(0,1);board.treasures.reverse();
  const fresh=generator.generateLevel(5);
  assert.equal(JSON.stringify(fresh),snap);
});
test('future unknown movement effects are not accidentally introduced',()=>{
  for(const level of generator.generateCampaign(30)){
    assert.equal(level.engineVersion,engine.ENGINE_VERSION);
    assert.equal(level.generatorVersion,generator.VERSION);
    assert.deepEqual(level.effects,[]);
    assert.equal(Object.hasOwn(level,'visualTerrain'),false);
  }
});
test('invalid indices, seed and campaign lengths are rejected explicitly',()=>{
  for(const n of [0,-1,1.5,NaN,Infinity,'1',generator.MAX_INDEX+1]){
    assert.throws(()=>generator.generateLevel(n),RangeError);
  }
  for(const bad of ['',42,null,'x'.repeat(129)])assert.throws(()=>generator.generateLevel(1,bad),TypeError);
  for(const n of [0,-1,1.2,Infinity,generator.MAX_INDEX+1]){
    assert.throws(()=>generator.generateCampaign(n),RangeError);
  }
});
test('browser global loads without Node imports and returns identical campaign',()=>{
  const context={window:{},Int16Array,Uint8Array,Math,Array,Set};
  vm.runInNewContext(source('js/treasure-generator.js'),context,{filename:'treasure-generator.js'});
  const answer=context.window.PathleTreasureGenerator.generateLevel(8);
  assert.equal(JSON.stringify(answer),JSON.stringify(generator.generateLevel(8)));
});
test('canonical Treasure Hunt loads v2 release after worlds and before the board renderer',()=>{
  const html=source('treasure-hunt.html');
  const scripts=['js/treasure-generator.js','js/treasure-worlds.js',
    'js/treasure-release-v2.js','js/treasure-bootstrap-v2.js',
    'js/treasure-ui.js','js/treasure-progress-v2.js',
    'js/treasure-save-v2.js','js/treasure-campaign-v2.js'];
  const positions=scripts.map(file=>html.indexOf(file));
  assert.ok(positions.every(x=>x>=0));
  assert.ok(positions.every((x,i)=>i===0||x>positions[i-1]));
  assert.ok(!html.includes('src="js/treasure-bootstrap.js'));
  assert.ok(!html.includes('src="js/treasure-campaign.js'));
  assert.ok(!html.includes('js/treasure-preview.js'));
  assert.ok(!html.includes('js/treasure-levels.js'));
  const bootstrap=source('js/treasure-bootstrap-v2.js');
  assert.match(bootstrap,/root.PathleTreasureLevels=release.levels/);
  assert.match(bootstrap,/root.PathleTreasureCampaignMode=true/);
  const home=source('index.html');
  assert.match(home,/id="playTreasure" href="treasure-hunt.html\?v=1\.5\.36"/);
  assert.match(source('js/treasure-ui.js'),/const levels = window.PathleTreasureLevels/);
});
