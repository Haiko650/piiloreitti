'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const grading = require('../js/treasure-grading.js');

function makeHarness() {
  const levels = [{id:'one',optimalMoves:12},{id:'two',optimalMoves:24},{id:'three',optimalMoves:35}];
  const elements = {};
  const handlers = new Map();
  const browserHandlers = new Map();
  let nextLevelClicks = 0;
  let restarts = 0;
  const doc = {activeElement:null,
    addEventListener(type,callback){handlers.set(type,callback);},
    getElementById(id){return elements[id];},
    querySelector(selector){
      if(selector==='.th-shell')return elements.game;
      if(selector==='[data-th-level="1"]')return {click(){nextLevelClicks++;}};
      if(selector==='[data-th-level="2"]')return {click(){nextLevelClicks++;}};
      throw new Error('Unexpected querySelector: '+selector);
    }
  };
  function element(id) {
    const callbacks = new Map();
    const el={id,hidden:false,inert:false,className:'',textContent:'',children:[],attrs:{},
      addEventListener(type,callback){callbacks.set(type,callback);},
      setAttribute(name,value){this.attrs[name]=value;},
      replaceChildren(){this.children=[];},
      append(child){this.children.push(child);},
      focus(){doc.activeElement=this;},
      click(){if(callbacks.has('click'))callbacks.get('click')();},
      querySelectorAll(){return [elements.thWinNext,elements.thWinReplay];}
    };
    elements[id]=el;return el;
  }
  for(const id of ['thVictory','thWinFins','thWinNext','thWinReplay','thWinMoves','thWinOptimal','thWinBest','thWinRecord','thWinTier','thWinLevel','thWinFinal','thRestart','game'])element(id);
  elements.thVictory.hidden=true;
  elements.thRestart.addEventListener('click',()=>{restarts++;});
  doc.createElement=type=>({className:'',innerHTML:''});
  const source=fs.readFileSync(path.join(__dirname,'../js/treasure-victory.js'),'utf8');
  const context={window:{PathleTreasureLevels:levels,PathleTreasureGrading:{
    rateRun(level,run){return grading.rateMoves(run.score,level.optimalMoves);}
  },addEventListener(type,fn){browserHandlers.set(type,fn);}},document:doc};
  vm.runInNewContext(source,context,{filename:'treasure-victory.js'});
  function win(index,score) {handlers.get('pathle:treasure-complete')({detail:{level:levels[index],run:{score},levelIndex:index}});}
  return {win,elements,doc,handlers,browserHandlers,get nextLevelClicks(){return nextLevelClicks;},get restarts(){return restarts;}};
}

test('gold result displays three fins, exact optimum and modal without touching the board',()=>{
 const h=makeHarness();h.win(0,13);
 assert.equal(h.elements.thVictory.hidden,false);
 assert.equal(h.elements.game.inert,true);
 assert.equal(h.elements.thWinFins.children.length,3);
 assert.equal(h.elements.thWinFins.className,'th-win-fins th-win-gold');
 assert.equal(h.elements.thWinMoves.textContent,'13');
 assert.equal(h.elements.thWinOptimal.textContent,'12');
 assert.equal(h.doc.activeElement,h.elements.thWinNext);
});

test('silver and blue results render exactly two and one fins',()=>{
 const h=makeHarness();h.win(1,26);
 assert.equal(h.elements.thWinFins.children.length,2);
 assert.equal(h.elements.thWinTier.textContent,'SILVER PERFORMANCE!');
 h.win(2,48);
 assert.equal(h.elements.thWinFins.children.length,1);
 assert.equal(h.elements.thWinFins.className,'th-win-fins th-win-blue');
 assert.equal(h.elements.thWinNext.hidden,true);
 assert.equal(h.elements.thWinFinal.hidden,false);
 assert.equal(h.doc.activeElement,h.elements.thWinReplay);
});

test('next and replay close the modal and click the existing game controls',()=>{
 const h=makeHarness();h.win(0,13);
 h.elements.thWinNext.click();
 assert.equal(h.nextLevelClicks,1);
 assert.equal(h.elements.thVictory.hidden,true);
 assert.equal(h.elements.game.inert,false);
 h.win(1,25);
 h.elements.thWinReplay.click();
 assert.equal(h.restarts,1);
 assert.equal(h.elements.thVictory.hidden,true);
});

test('session records can only improve, and are separate for each level',()=>{
 const h=makeHarness();h.win(0,13);
 assert.equal(h.elements.thWinRecord.textContent,'FIRST CLEAR!');
 h.win(0,15);
 assert.equal(h.elements.thWinRecord.textContent,'WELL DONE!');
 assert.equal(h.elements.thWinBest.textContent,'Best this session: 13 moves');
 h.win(0,12);
 assert.equal(h.elements.thWinRecord.textContent,'NEW BEST!');
 assert.equal(h.elements.thWinBest.textContent,'Best this session: 12 moves');
 h.win(1,24);
 assert.equal(h.elements.thWinBest.textContent,'Best this session: 24 moves');
});

test('level switch closes an open result, restoring keyboard interaction',()=>{
 const h=makeHarness();h.win(0,13);
 h.handlers.get('pathle:treasure-level-change')({detail:{levelId:'two'}});
 assert.equal(h.elements.thVictory.hidden,true);
 assert.equal(h.elements.game.inert,false);
});

test('invalid completion payload is rejected instead of showing the wrong result',()=>{
 const h=makeHarness();
 assert.throws(()=>h.handlers.get('pathle:treasure-complete')({detail:{level:{id:'missing'},run:{score:12},levelIndex:0}}),/invalid level completion data/);
 assert.equal(h.elements.thVictory.hidden,true);
});

test('Android system Back also closes the visible result overlay',()=>{
 const h=makeHarness();h.win(0,13);
 assert.equal(h.elements.thVictory.hidden,false);
 h.browserHandlers.get('popstate')({state:null});
 assert.equal(h.elements.thVictory.hidden,true);
 assert.equal(h.elements.game.inert,false);
});
