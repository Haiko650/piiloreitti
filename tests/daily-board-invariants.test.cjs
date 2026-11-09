'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function loadDailyEngine(){
  const source=fs.readFileSync(path.join(__dirname,'../js/board-engine.js'),'utf8');
  const context={window:{}};
  vm.runInNewContext(source,context,{filename:'board-engine.js'});
  return context.window.PathleBoardEngine;
}

test('Daily generator: seeded boards have safe paths, visible clues and disjoint blockers',()=>{
  const engine=loadDailyEngine();
  const dates=[
    '2026-01-01','2026-02-14','2026-03-20','2026-04-01','2026-05-17',
    '2026-06-30','2026-07-04','2026-08-31','2026-09-15','2026-10-31',
    '2026-11-09','2026-12-24'
  ];
  const missed=[];
  let checked=0;
  for(const date of dates)for(let day=1;day<=7;day++)for(let level=0;level<3;level++){
    const config=engine.CONFIG[level];
    const seed='official|'+date+'|'+day;
    const board=engine.makeBoard(day,level,seed);
    const again=engine.makeBoard(day,level,seed);
    assert.equal(JSON.stringify(board),JSON.stringify(again),'Non-deterministic board for '+seed);
    const n=config.size,pathTiles=board.path;
    const cellCount=n*n;
    assert.equal(pathTiles[0],0);
    assert.equal(pathTiles.at(-1),cellCount-1);
    assert.equal(new Set(pathTiles).size,pathTiles.length);
    for(let i=1;i<pathTiles.length;i++){
      const a=pathTiles[i-1],b=pathTiles[i];
      assert.ok(b>=0&&b<cellCount);
      assert.equal(Math.abs(a%n-b%n)+Math.abs(Math.floor(a/n)-Math.floor(b/n)),1);
    }
    const route=new Set(pathTiles);
    assert.equal(new Set(board.blocks).size,board.blocks.length);
    assert.ok(board.blocks.every(id=>id>=0&&id<cellCount&&!route.has(id)));
    assert.equal(new Set(board.pearls).size,board.pearls.length);
    assert.ok(board.pearls.every(id=>route.has(id)&&id!==0&&id!==cellCount-1));
    if(pathTiles.length!==config.steps+1)missed.push({date,day,level,actual:pathTiles.length,expected:config.steps+1});
    checked++;
  }
  assert.equal(checked,252);
  assert.deepEqual(missed,[],'Daily path generator fell back to a shorter route');
});

test('Daily route generation uses deterministic seeds without mutation',()=>{
  const engine=loadDailyEngine();
  for(let level=0;level<3;level++){
    const a=engine.makeRoute('pathle-quality-seed-01',level);
    const b=engine.makeRoute('pathle-quality-seed-01',level);
    assert.equal(JSON.stringify(a),JSON.stringify(b));
    assert.equal(a[0],0);
    assert.equal(a.at(-1),engine.CONFIG[level].size**2-1);
  }
});
