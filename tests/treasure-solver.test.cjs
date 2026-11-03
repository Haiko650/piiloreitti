/* TH.3A automated verification: node --test tests/*.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('../js/treasure-engine.js');
const solver = require('../js/treasure-solver.js');
const levels = require('../js/treasure-levels.js');

function custom(overrides = {}) {
  return {
    id:'th-solver-test', engineVersion:1, environment:'coast',
    width:3, height:3, start:0, goal:8, blocked:[], treasures:[4], effects:[],
    ...overrides
  };
}

function replayAndCheck(level, route) {
  assert.equal(route[0], level.start);
  assert.equal(route.at(-1), level.goal);
  let state = engine.createRun(level);
  for(const destination of route.slice(1)) {
    const applied = engine.applyAction(level, state, {type:'move', to:destination});
    assert.equal(applied.accepted, true, 'Invalid move ' + state.position + ' -> ' + destination);
    state = applied.state;
  }
  assert.equal(state.completed, true);
  assert.equal(state.collected.length, level.treasures.length);
  assert.equal(engine.getScore(state), route.length-1);
}

test('exact optimum for the three approved TH.2 prototype boards', () => {
  assert.deepEqual(levels.map(level => solver.solve(level).optimalMoves), [12,24,35]);
});

test('returned routes replay successfully in the actual TH.1 rules engine', () => {
  for(const level of levels) replayAndCheck(level, solver.solve(level).path);
});

test('a single treasure on a clear 3x3 board has an exact four-move path', () => {
  const result = solver.solve(custom());
  assert.equal(result.optimalMoves,4);
  assert.equal(result.path.length,5);
  replayAndCheck(custom(),result.path);
});

test('the optimal solution can require backtracking through already visited tiles', () => {
  // Corridor 0-1-2-3, start 1, treasure 0, goal 3: must step left and return.
  const l = custom({width:4,height:2,start:1,goal:3,blocked:[4,5,6,7],treasures:[0]});
  const answer = solver.solve(l);
  assert.equal(answer.optimalMoves,4);
  assert.deepEqual(answer.path,[1,0,1,2,3]);
  replayAndCheck(l,answer.path);
});

test('the path visits every treasure regardless of input order', () => {
  const l=custom({width:4,height:2,start:0,goal:3,blocked:[],treasures:[6,1,4]});
  const result=solver.solve(l);
  replayAndCheck(l,result.path);
  assert.equal(new Set(result.path.filter(x=>l.treasures.includes(x))).size,3);
});

test('rejects unreachable treasures and invalid boards instead of guessing an optimum', () => {
  const bad=custom({blocked:[1,3]});
  assert.equal(engine.validateLevel(bad).valid,false);
  assert.throws(()=>solver.solve(bad), /Cannot solve invalid or unsupported/);
  assert.throws(()=>solver.solve(custom({effects:[{type:'current',at:1}]})), /unsupported TH.1 level/);
  assert.throws(()=>solver.solve(custom({goal:0})), TypeError);
});

test('does not change its input level definition, and returns independent route arrays', () => {
  const level=structuredClone(levels[0]);
  const original=JSON.stringify(level);
  const first=solver.solve(level);
  first.path[0]=999;
  const second=solver.solve(level);
  assert.equal(second.path[0],level.start);
  assert.equal(JSON.stringify(level),original);
});

test('ties resolve deterministically on repeated runs', () => {
  const l=custom({width:3,height:2,start:0,goal:5,treasures:[1,3]});
  const a=solver.solve(l);
  const b=solver.solve(l);
  assert.deepEqual(a,b);
  replayAndCheck(l,a.path);
});

test('maximum 10x15 board and five treasures stay inside the finite state bound', () => {
  const large=levels[2];
  const answer=solver.solve(large);
  assert.equal(answer.optimalMoves,35);
  assert.ok(answer.exploredStates>0);
  assert.ok(answer.exploredStates <= 150*32);
  replayAndCheck(large, answer.path);
});

test('the solver has a browser global API without requiring a bundler', () => {
  const source=fs.readFileSync(path.join(__dirname,'../js/treasure-solver.js'),'utf8');
  const context={window:{PathleTreasureEngine:engine}};
  vm.runInNewContext(source,context,{filename:'treasure-solver.js'});
  const answer=context.window.PathleTreasureSolver.solve(levels[0]);
  assert.equal(answer.optimalMoves,12);
  assert.equal(answer.path.length,13);
});
