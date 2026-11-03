/* Pathle Treasure Hunt – TH.2 test UI.
 * Separate page and styles: does not access Daily Adventure or IndexedDB.
 * All scoring and rules are delegated to PathleTreasureEngine (TH.1).
 */
(function () {
  'use strict';
  const engine = window.PathleTreasureEngine;
  if (!engine) throw new Error('Treasure Hunt requires js/treasure-engine.js');

  const levels = window.PathleTreasureLevels;
  if (!Array.isArray(levels) || levels.length !== 3) throw new Error('TH.2 needs three test levels');
  const $ = id => document.getElementById(id);
  const board = $('thBoard');
  const moves = $('thMoves');
  const treasures = $('thTreasures');
  const levelText = $('thLevel');
  const msg = $('thMessage');
  const next = $('thNext');
  const tabs = [...document.querySelectorAll('[data-th-level]')];
  let levelIndex = 0;
  let level = null;
  let state = null;
  let tiles = [];
  let fin = null;
  let pointerId = null;
  let lastPoint = null;
  let resizeObserver = null;
  const statusMessage = 'Collect every treasure, then reach the golden X.';

  const FIN_SVG = '<svg viewBox="0 0 52 52" aria-hidden="true"><ellipse cx="26" cy="42" rx="20" ry="6" fill="#a6f5f6" opacity=".5"/><path d="M7 42 C17 29 21 12 27 6 C34 9 41 27 44 43 C30 36 21 39 7 42 Z" fill="#176bb8" stroke="#054778" stroke-width="2.6"/><path d="M17 36 Q27 15 28 13" fill="none" stroke="#7bd2f2" stroke-width="3.2" stroke-linecap="round"/></svg>';
  const TREASURE_SVG = '<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M5 31 Q8 13 25 12 Q42 13 45 31 Q41 45 25 45 Q9 43 5 31Z" fill="#f6d6a1" stroke="#e8a572" stroke-width="2"/><path d="M9 29L25 42 41 29 M16 17L25 42 34 17" fill="none" stroke="#fff0c8" stroke-width="2"/><circle cx="25" cy="25" r="9" fill="#fff6dd" stroke="#80dfdc" stroke-width="2"/><circle cx="22" cy="21" r="3" fill="#fff"/></svg>';

  function measureFin() {
    if (!fin || !tiles.length) return;
    const rect = board.getBoundingClientRect();
    const tile = tiles[state.position].getBoundingClientRect();
    const size = Math.min(tile.width,tile.height);
    fin.style.setProperty('--cell', `${size}px`);
    fin.style.width = `${size}px`;
    fin.style.height = `${size}px`;
    fin.style.transform = `translate3d(${tile.left - rect.left + (tile.width-size)/2}px,${tile.top - rect.top + (tile.height-size)/2}px,0)`;
  }

  function update() {
    moves.textContent = String(engine.getScore(state));
    treasures.textContent = `${state.collected.length} / ${level.treasures.length}`;
    levelText.textContent = `${levelIndex+1} / ${levels.length}`;
    const allCollected = state.collected.length === level.treasures.length;
    tiles.forEach((tile,id) => {
      tile.classList.toggle('treasure-gone',state.collected.includes(id));
      tile.classList.toggle('is-ready',allCollected && id===level.goal);
    });
    if (state.completed) {
      msg.textContent = `Treasure Hunt complete! ${engine.getScore(state)} moves. Nice swimming, Haiko!`;
      msg.classList.add('is-won');
      next.hidden = levelIndex === levels.length-1;
    } else {
      msg.textContent = allCollected ? 'All treasures found! Swim to the golden X.' : statusMessage;
      msg.classList.remove('is-won');
      next.hidden = true;
    }
    measureFin();
  }

  function makeBoard() {
    board.replaceChildren();
    board.style.setProperty('--cols',String(level.width));
    board.style.setProperty('--rows',String(level.height));
    board.setAttribute('aria-label',`${level.width} by ${level.height} Treasure Hunt board, ${level.treasures.length} treasures`);
    board.tabIndex=0;
    tiles=[];
    const blocked=new Set(level.blocked);
    const treasureSet=new Set(level.treasures);
    for (let id=0;id<level.width*level.height;id++) {
      const tile=document.createElement('div');
      tile.className='th-tile';
      tile.setAttribute('role','gridcell');
      tile.setAttribute('aria-label',blocked.has(id)?'Reef obstacle':id===level.goal?'Golden X goal':treasureSet.has(id)?'Treasure':id===level.start?'Start':'Water');
      if(blocked.has(id))tile.classList.add('is-land');
      if(id===level.start)tile.classList.add('is-start');
      if(id===level.goal)tile.classList.add('is-goal');
      if(treasureSet.has(id)) {
        const gem=document.createElement('span');
        gem.className='th-treasure';
        gem.innerHTML=TREASURE_SVG;
        tile.append(gem);
      }
      board.append(tile);
      tiles.push(tile);
    }
    fin=document.createElement('div');
    fin.className='th-fin';
    fin.setAttribute('aria-hidden','true');
    fin.innerHTML=FIN_SVG;
    board.append(fin);
    measureFin();
  }

  function selectLevel(index) {
    if(!Number.isInteger(index)||index<0||index>=levels.length) return;
    const chosen=levels[index];
    const validation=engine.validateLevel(chosen);
    if(!validation.valid) throw new Error(`Invalid TH.2 test level ${index+1}: ${validation.errors.join('; ')}`);
    pointerId=null;
    lastPoint=null;
    levelIndex=index;
    level=chosen;
    state=engine.createRun(level);
    tabs.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    makeBoard();
    update();
  }

  function moveTo(tile) {
    const result=engine.applyAction(level,state,{type:'move',to:tile});
    if(!result.accepted) return false;
    state=result.state;
    update();
    return true;
  }

  function cellAtPoint(clientX,clientY) {
    const rect=board.getBoundingClientRect();
    if(clientX<rect.left||clientX>=rect.right||clientY<rect.top||clientY>=rect.bottom) return null;
    const style=getComputedStyle(board);
    const left=parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft);
    const top=parseFloat(style.borderTopWidth)+parseFloat(style.paddingTop);
    const right=parseFloat(style.borderRightWidth)+parseFloat(style.paddingRight);
    const bottom=parseFloat(style.borderBottomWidth)+parseFloat(style.paddingBottom);
    const gapX=parseFloat(style.columnGap)||0;
    const gapY=parseFloat(style.rowGap)||0;
    const spaceX=rect.width-left-right;
    const spaceY=rect.height-top-bottom;
    const tileW=(spaceX-(level.width-1)*gapX)/level.width;
    const tileH=(spaceY-(level.height-1)*gapY)/level.height;
    const x=Math.floor((clientX-rect.left-left)/(tileW+gapX));
    const y=Math.floor((clientY-rect.top-top)/(tileH+gapY));
    if(x<0||x>=level.width||y<0||y>=level.height) return null;
    return y*level.width+x;
  }

  function traceSegment(a,b) {
    // Sample a dragged segment finely enough to visit every crossed cell.
    // Each sample may move only to an adjacent tile; no skipping or teleporting.
    const rect=board.getBoundingClientRect();
    const step=Math.max(2,Math.min(rect.width/level.width,rect.height/level.height)/4);
    const steps=Math.min(200,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/step));
    for(let i=1;i<=steps;i++) {
      if(state.completed) break;
      const x=a.x+(b.x-a.x)*i/steps;
      const y=a.y+(b.y-a.y)*i/steps;
      const id=cellAtPoint(x,y);
      if(id===null||id===state.position) continue;
      const sx=state.position%level.width,sy=Math.floor(state.position/level.width);
      const tx=id%level.width,ty=Math.floor(id/level.width);
      if(Math.abs(sx-tx)+Math.abs(sy-ty)===1) moveTo(id);
    }
  }

  board.addEventListener('pointerdown',event=>{
    if(pointerId!==null||state.completed||event.button!==0)return;
    if(event.pointerType==='mouse'&&event.buttons!==1)return;
    event.preventDefault();
    pointerId=event.pointerId;
    lastPoint={x:event.clientX,y:event.clientY};
    try{board.setPointerCapture(pointerId);}catch(_error){}
    const target=cellAtPoint(event.clientX,event.clientY);
    if(target!==null) moveTo(target);
  });
  board.addEventListener('pointermove',event=>{
    if(event.pointerId!==pointerId||!lastPoint)return;
    event.preventDefault();
    const nextPoint={x:event.clientX,y:event.clientY};
    traceSegment(lastPoint,nextPoint);
    lastPoint=nextPoint;
  });
  function stopPointer(event){
    if(event.pointerId!==pointerId)return;
    if(lastPoint && event.type==='pointerup')traceSegment(lastPoint,{x:event.clientX,y:event.clientY});
    pointerId=null;lastPoint=null;
    try{if(board.hasPointerCapture(event.pointerId))board.releasePointerCapture(event.pointerId);}catch(_error){}
  }
  board.addEventListener('pointerup',stopPointer);
  board.addEventListener('pointercancel',stopPointer);
  board.addEventListener('lostpointercapture',event=>{if(event.pointerId===pointerId){pointerId=null;lastPoint=null;}});
  board.addEventListener('keydown',event=>{
    const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[event.key];
    if(!dir||state.completed)return;
    event.preventDefault();
    const result=engine.applyAction(level,state,{type:'move',direction:dir});
    if(result.accepted){state=result.state;update();}
  });
  tabs.forEach((button,index)=>button.addEventListener('click',()=>selectLevel(index)));
  $('thRestart').addEventListener('click',()=>selectLevel(levelIndex));
  next.addEventListener('click',()=>selectLevel(levelIndex+1));
  if('ResizeObserver' in window) {
    resizeObserver=new ResizeObserver(()=>measureFin());
    resizeObserver.observe(board);
  } else window.addEventListener('resize',measureFin);
  selectLevel(0);
})();
