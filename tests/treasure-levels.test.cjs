'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../js/treasure-engine.js');
const levels = require('../js/treasure-levels.js');

test('TH.2 includes three valid, differently sized persistent prototype maps', () => {
  assert.deepEqual(levels.map(level => [level.width, level.height]), [[6,8],[8,12],[10,15]]);
  assert.equal(new Set(levels.map(level=>level.id)).size,3);
  for (const level of levels) {
    assert.deepEqual(engine.validateLevel(level), {valid:true,errors:[]});
    assert.notEqual(level.start,level.goal);
    assert.ok(level.treasures.length>=2);
  }
});

test('TH.2 levels have a legal route through all treasures to the goal', () => {
  for(const level of levels) {
    const queue=[{state:engine.createRun(level),route:[]}];
    const seen=new Set();
    let completed=null;
    for(let i=0;i<queue.length;i++) {
      const {state,route}=queue[i];
      const key=`${state.position}:${state.collected.slice().sort((a,b)=>a-b).join(',')}`;
      if(seen.has(key))continue;
      seen.add(key);
      if(state.completed){completed={state,route};break;}
      for(const next of engine.getNeighbors(level,state.position)) {
        const r=engine.applyAction(level,state,{type:'move',to:next});
        assert.equal(r.accepted,true);
        queue.push({state:r.state,route:[...route,next]});
      }
    }
    assert.ok(completed,`${level.id} was unsolvable`);
    assert.ok(completed.state.moves>0);
    assert.equal(completed.state.collected.length,level.treasures.length);
  }
});
