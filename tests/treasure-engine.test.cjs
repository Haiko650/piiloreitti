/* Run: node --test tests/treasure-engine.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/treasure-engine.js');

function makeLevel(overrides = {}) {
  return {
    id: 'th-test-001', engineVersion: 1, environment: 'coast',
    width: 3, height: 3, start: 6, goal: 2,
    blocked: [4], treasures: [3, 5], effects: [],
    ...overrides
  };
}
function step(level, state, to) { return TH.applyAction(level, state, { type: 'move', to }); }

test('TH.1 exports a browser-compatible standalone rules engine', () => {
  assert.equal(TH.ENGINE_VERSION, 1);
  assert.equal(TH.MAX_WIDTH, 10);
  assert.equal(TH.MAX_HEIGHT, 15);
  assert.equal(typeof TH.applyAction, 'function');
});

test('accepts rectangular boards, including 10x15, with variable start and goal', () => {
  const b = makeLevel({width:10,height:15,start:74,goal:10,blocked:[],treasures:[99]});
  assert.equal(TH.validateLevel(b).valid, true);
  assert.deepEqual(TH.createRun(b), {position:74,collected:[],moves:0,penalties:0,completed:false});
  assert.deepEqual(TH.getNeighbors(b, 74), [64,75,84,73]);
});

test('validates blocked cells, start/goal, unreachable treasures and duplicate tiles', () => {
  assert.equal(TH.validateLevel(makeLevel()).valid, true);
  assert.equal(TH.validateLevel(makeLevel({goal:6})).valid, false);
  assert.equal(TH.validateLevel(makeLevel({blocked:[4,6]})).valid, false);
  assert.equal(TH.validateLevel(makeLevel({treasures:[3,3]})).valid, false);
  assert.equal(TH.validateLevel(makeLevel({blocked:[1,3,4]})).valid, false);
  assert.equal(TH.validateLevel(makeLevel({effects:[{type:'current',at:0}]})).valid, false);
  assert.equal(TH.validateLevel(makeLevel({width:11})).valid, false);
  assert.equal(TH.validateLevel(makeLevel({height:16})).valid, false);
  assert.throws(() => TH.createRun(makeLevel({goal:6})), TypeError);
});

test('all four directions work; backtracking costs a move; state is immutable', () => {
  const b = makeLevel({blocked:[],treasures:[0]});
  const first = TH.createRun(b);
  const right = TH.applyAction(b, first, {type:'move',direction:'right'});
  assert.equal(right.accepted,true);
  assert.equal(right.state.position,7);
  assert.equal(right.state.moves,1);
  const left = TH.applyAction(b,right.state,{type:'move',direction:'left'});
  assert.equal(left.state.position,6);
  assert.equal(left.state.moves,2);
  const up = TH.applyAction(b,left.state,{type:'move',direction:'up'});
  assert.equal(up.state.position,3);
  const down = TH.applyAction(b,up.state,{type:'move',direction:'down'});
  assert.equal(down.state.position,6);
  assert.equal(down.state.moves,4);
  assert.deepEqual(first, {position:6,collected:[],moves:0,penalties:0,completed:false});
});

test('blocked, nonadjacent, wrapped, same-cell and outside moves are rejected at zero cost', () => {
  const b = makeLevel();
  const initial = TH.createRun(b);
  for(const [action,reason] of [
    [{type:'move',to:4}, 'not-adjacent'],
    [{type:'move',to:2}, 'not-adjacent'],
    [{type:'move',to:6}, 'not-adjacent'],
    [{type:'move',to:-1}, 'out-of-bounds'],
    [{type:'move',direction:'down'}, 'out-of-bounds'],
    [{type:'move',direction:'jump'}, 'invalid-action'],
    [{type:'wait'}, 'invalid-action']
  ]){
    const result=TH.applyAction(b,initial,action);
    assert.equal(result.accepted,false,JSON.stringify(action));
    assert.equal(result.reason,reason,JSON.stringify(action));
    assert.equal(result.state,initial);
    assert.deepEqual(result.events,[]);
  }
  const wallFrom3=step(b,step(b,initial,3).state,4);
  assert.equal(wallFrom3.reason,'blocked');
  // Tile 5 is not adjacent to tile 3 (prevents row wrapping).
  assert.equal(step(b,step(b,initial,3).state,5).reason,'not-adjacent');
});

test('swipe-like sequences use the same single-step logic and cost each accepted tile', () => {
  const b=makeLevel({blocked:[],treasures:[8]});
  let state=TH.createRun(b);
  for (const to of [7,8,5,2]) {
    const result=step(b,state,to);
    assert.equal(result.accepted,true);
    state=result.state;
  }
  assert.equal(state.moves,4);
  assert.deepEqual(state.collected,[8]);
  assert.equal(state.completed,true);
});

test('treasures are collected once; goal is traversable early; completion needs all treasures and goal', () => {
  const b=makeLevel();
  let s=TH.createRun(b);
  // Start 6 -> 3 -> 0 -> 1 -> goal 2: not complete.
  for(const to of [3,0,1,2])s=step(b,s,to).state;
  assert.deepEqual(s.collected,[3]);
  assert.equal(s.completed,false);
  assert.equal(TH.checkCompletion(b,s),false);
  // Return through goal and go around via bottom row to tile 5, then goal.
  const route=[1,2,5,2];
  // 2->1->2->5->2 (yes, tile 5 directly below tile 2).
  let events=[];
  for (const to of route) {
    const r=step(b,s,to); assert.equal(r.accepted,true); s=r.state; events.push(...r.events);
  }
  assert.deepEqual(s.collected,[3,5]);
  assert.equal(s.completed,true);
  assert.equal(s.moves,8);
  assert.equal(TH.getScore(s),8);
  assert.equal(events.filter(e=>e.type==='treasure-collected').length,1);
  assert.equal(events.filter(e=>e.type==='level-completed').length,1);
  assert.equal(step(b,s,1).reason,'already-completed');
});

test('a treasure is not counted twice after backtracking', () => {
  const b=makeLevel();
  let s=TH.createRun(b);
  let r=step(b,s,3); s=r.state;
  assert.equal(r.events.filter(e=>e.type==='treasure-collected').length,1);
  s=step(b,s,6).state;
  r=step(b,s,3);
  assert.deepEqual(r.state.collected,[3]);
  assert.equal(r.events.filter(e=>e.type==='treasure-collected').length,0);
});

test('returns movement, treasure and completion events in deterministic order', () => {
  const b=makeLevel({blocked:[],start:0,goal:2,treasures:[1]});
  const first=step(b,TH.createRun(b),1);
  assert.deepEqual(first.events,[
    {type:'moved',from:0,to:1,source:'player',cost:1},
    {type:'treasure-collected',tile:1}
  ]);
  const second=step(b,first.state,2);
  assert.deepEqual(second.events,[
    {type:'moved',from:1,to:2,source:'player',cost:1},
    {type:'level-completed',score:2}
  ]);
});

test('validates saved run shape and rejects forged completion or invalid score', () => {
  const b=makeLevel();
  const s=TH.createRun(b);
  assert.equal(TH.validateRun(b,s).valid,true);
  assert.equal(TH.validateRun(b,{...s,completed:true}).valid,false);
  assert.equal(TH.validateRun(b,{...s,collected:[0]}).valid,false);
  assert.equal(TH.validateRun(b,{...s,moves:-1}).valid,false);
  assert.equal(TH.validateRun(b,{...s,position:4}).valid,false);
  assert.throws(()=>TH.applyAction(b,{...s,moves:-1},{type:'move',to:3}),TypeError);
  assert.equal(TH.getScore({...s,moves:4,penalties:1}),5);
});

test('effect extension is intentionally inert in TH.1 and does not touch the caller',()=>{
  const b=makeLevel();const s=TH.createRun(b);const events=[];
  const result=TH.resolveEffects(b,s,events);
  assert.equal(result.state,s);
  assert.equal(result.events,events);
});

test('a sampled set of valid rectangular boards always allows complete treasure collection',()=>{
  // Validation's reachability guarantee, exercised for different non-square layouts.
  for(const [width,height] of [[2,4],[3,7],[7,10],[10,15]]) {
    const n=width*height;
    const b=makeLevel({id:`th-${width}-${height}`,width,height,start:width-1,goal:n-width,blocked:[],treasures:[n-1]});
    assert.equal(TH.validateLevel(b).valid,true);
    assert.equal(TH.getNeighbors(b,b.start).every(t=>t>=0&&t<n),true);
  }
});

test('browser global API works without a bundler or Node module variables', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const src = fs.readFileSync(require('node:path').join(__dirname,'../js/treasure-engine.js'),'utf8');
  const sandbox = {window:{}};
  vm.runInNewContext(src,sandbox,{filename:'treasure-engine.js'});
  assert.equal(typeof sandbox.window.PathleTreasureEngine.createRun,'function');
  assert.equal(sandbox.window.PathleTreasureEngine.ENGINE_VERSION,1);
});

test('a disconnected goal or a non-blocked isolated treasure is rejected', () => {
  const b=makeLevel({blocked:[3,4,5],start:6,goal:2,treasures:[0]});
  const result=TH.validateLevel(b);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(e=>e.includes('Goal cannot be reached')));
  assert.ok(result.errors.some(e=>e.includes('treasures are reachable')));
});

test('score boundaries and run serialization remain well-formed', () => {
  const b=makeLevel({start:0,goal:8,blocked:[],treasures:[1]});
  const s=TH.createRun(b);
  const r=TH.applyAction(b,s,{type:'move',to:1});
  assert.equal(TH.validateRun(b,JSON.parse(JSON.stringify(r.state))).valid,true);
  assert.throws(()=>TH.getScore({...s,moves:Number.MAX_SAFE_INTEGER,penalties:1}),TypeError);
  const overflow=TH.applyAction(b,{...s,moves:Number.MAX_SAFE_INTEGER},{type:'move',to:1});
  assert.equal(overflow.accepted,false);
  assert.equal(overflow.reason,'score-overflow');
  assert.equal(overflow.state.moves,Number.MAX_SAFE_INTEGER);
});

test('many deterministic moves on maximum-size board keep state and input consistent', () => {
  const b=makeLevel({id:'th-stress',width:10,height:15,start:0,goal:149,blocked:[],treasures:[74]});
  const frozen=JSON.stringify(b);
  let s=TH.createRun(b);
  for(let i=0;i<125;i++) {
    const ns=TH.getNeighbors(b,s.position);
    const r=step(b,s,ns[i%ns.length]);
    assert.equal(r.accepted,true);
    assert.equal(r.state.moves,i+1);
    assert.equal(TH.validateRun(b,r.state).valid,true);
    s=r.state;
  }
  assert.equal(JSON.stringify(b),frozen);
  assert.equal(TH.getScore(s),125);
});
