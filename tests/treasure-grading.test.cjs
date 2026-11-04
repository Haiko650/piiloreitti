'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const grading = require('../js/treasure-grading.js');

const input = [
  {opt:12,gold:13,silver:15},
  {opt:24,gold:25,silver:30},
  {opt:35,gold:36,silver:43}
];

for (const {opt,gold,silver} of input) {
  test('correct 3/2/1 fin boundaries for optimum '+opt, () => {
    assert.deepEqual(grading.getThresholds(opt), {goldMaxMoves:gold, silverMaxMoves:silver});
    assert.equal(grading.rateMoves(opt,opt).fins, 3);
    assert.equal(grading.rateMoves(gold,opt).tier,'gold');
    assert.equal(grading.rateMoves(gold+1,opt).tier,'silver');
    assert.equal(grading.rateMoves(silver,opt).tier,'silver');
    assert.equal(grading.rateMoves(silver+1,opt).tier,'blue');
    assert.equal(grading.rateMoves(1000,opt).fins, 1);
  });
}

test('minimum one bonus move for gold and two for silver on very short levels', () => {
  assert.deepEqual(grading.getThresholds(1), {goldMaxMoves:2,silverMaxMoves:3});
  assert.deepEqual(grading.getThresholds(2), {goldMaxMoves:3,silverMaxMoves:4});
  assert.deepEqual(grading.getThresholds(5), {goldMaxMoves:6,silverMaxMoves:7});
});

test('thresholds use integer moves with floor rounding', () => {
  assert.deepEqual(grading.getThresholds(20), {goldMaxMoves:21,silverMaxMoves:25});
  assert.deepEqual(grading.getThresholds(100), {goldMaxMoves:105,silverMaxMoves:125});
  assert.deepEqual(grading.getThresholds(101), {goldMaxMoves:106,silverMaxMoves:126});
});

test('the return value includes stable fields needed for a future win popup', () => {
  assert.deepEqual(grading.rateMoves(25,24), {
    gradingVersion:1,score:25,optimalMoves:24,extraMoves:1,
    fins:3,tier:'gold',thresholds:{goldMaxMoves:25,silverMaxMoves:30}
  });
});

test('rejects incomplete or malformed scores instead of silently giving blue fins', () => {
  for(const x of [undefined,null,0,-1,1.5,NaN,Infinity,'20',Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(()=>grading.rateMoves(x,12),TypeError);
    assert.throws(()=>grading.getThresholds(x),TypeError);
  }
  assert.throws(()=>grading.rateMoves(11,12),RangeError);
  assert.throws(()=>grading.getThresholds(Number.MAX_SAFE_INTEGER),RangeError);
});

test('grading remains deterministic and does not mutate the score input', () => {
  const first=grading.rateMoves(41,35);
  assert.deepEqual(grading.rateMoves(41,35),first);
  assert.equal(first.tier,'silver');
  assert.equal(first.extraMoves,6);
});

test('a browser global can rate a completed run using Engine + Solver contracts', () => {
  const source=fs.readFileSync(path.join(__dirname,'../js/treasure-grading.js'),'utf8');
  const fakeEngine={
    validateRun:(_level,run)=>({valid:run && Number.isInteger(run.moves),errors:run ? [] : ['missing run']}),
    getScore:run=>run.moves+run.penalties
  };
  const fakeSolver={solve:level=>({optimalMoves:level.optimalMoves})};
  const context={window:{PathleTreasureEngine:fakeEngine,PathleTreasureSolver:fakeSolver}};
  vm.runInNewContext(source,context,{filename:'treasure-grading.js'});
  const l={optimalMoves:12};
  const rated=context.window.PathleTreasureGrading.rateRun(l,{moves:14,penalties:0,completed:true});
  assert.equal(rated.tier,'silver');
  assert.equal(rated.extraMoves,2);
  assert.throws(()=>context.window.PathleTreasureGrading.rateRun(l,{moves:12,penalties:0,completed:false}),/before the level is completed/);
  assert.throws(()=>context.window.PathleTreasureGrading.rateRun(l,null),/invalid Treasure Hunt run/);
});

test('browser integration refuses to grade when rule modules are missing', () => {
  const source=fs.readFileSync(path.join(__dirname,'../js/treasure-grading.js'),'utf8');
  const context={window:{}};
  vm.runInNewContext(source,context);
  assert.throws(()=>context.window.PathleTreasureGrading.rateRun({},{}),/requires Treasure Engine and Treasure Solver/);
});
