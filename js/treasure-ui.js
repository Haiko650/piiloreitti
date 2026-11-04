/* Pathle Treasure Hunt – board renderer and movement input.
 * Campaign map selects a level after progress is verified; movement and
 * scoring are delegated to the separately tested Treasure Engine.
 */
(function () {
  'use strict';
  const engine = window.PathleTreasureEngine;
  const visualAssets = window.PathleVisualAssets;
  if (!visualAssets) throw new Error('TH.3D requires visual-assets.js');
  if (!engine) throw new Error('Treasure Hunt requires js/treasure-engine.js');

  const levels = window.PathleTreasureLevels;
  if (!Array.isArray(levels) || levels.length < 1) throw new Error('Treasure Hunt needs at least one valid level');
  const $ = id => document.getElementById(id);
  const board = $('thBoard');
  const moves = $('thMoves');
  const treasures = $('thTreasures');
  const levelText = $('thLevel');
  const msg = $('thMessage');
  // Level selection now happens exclusively through the numbered adventure map.
  // The map/controller owns unlocking and persistence; this module only renders
  // the selected board and runs its existing, independently tested mechanics.
  if(!window.PathleTreasureCampaignMode)throw new Error('Treasure Hunt requires the adventure bootstrap');
  document.body.classList.add('th-campaign');
  let levelIndex = 0;
  let level = null;
  let state = null;
  let tiles = [];
  let fin = null;
  let pointerId = null;
  let lastPoint = null;
  let resizeObserver = null;
  const MOVE_MS = 80;
  const MAX_PENDING_MOVES = 250;
  let pendingMoves = [];
  let moveTimer = null;
  let victoryTimer = null;
  let animating = false;
  let blocked = new Set();
  const statusMessage = 'Collect every treasure, then reach the golden X.';
  const idlePeek=visualAssets.createIdlePeek({
    theme:()=>level?level.environment:'coast',
    anchor:()=>fin,
    canShow:()=>!!level&&!!state&&!state.completed&&!animating&&
      pendingMoves.length===0&&pointerId===null&&$('thVictory').hidden
  });

  const FIN_SVG = '<svg viewBox="0 0 52 52" aria-hidden="true"><ellipse cx="26" cy="42" rx="20" ry="6" fill="#a6f5f6" opacity=".5"/><path d="M7 42 C17 29 21 12 27 6 C34 9 41 27 44 43 C30 36 21 39 7 42 Z" fill="#176bb8" stroke="#054778" stroke-width="2.6"/><path d="M17 36 Q27 15 28 13" fill="none" stroke="#7bd2f2" stroke-width="3.2" stroke-linecap="round"/></svg>';
  const TREASURE_SVG = '<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M5 31 Q8 13 25 12 Q42 13 45 31 Q41 45 25 45 Q9 43 5 31Z" fill="#f6d6a1" stroke="#e8a572" stroke-width="2"/><path d="M9 29L25 42 41 29 M16 17L25 42 34 17" fill="none" stroke="#fff0c8" stroke-width="2"/><circle cx="25" cy="25" r="9" fill="#fff6dd" stroke="#80dfdc" stroke-width="2"/><circle cx="22" cy="21" r="3" fill="#fff"/></svg>';

  // Fit within the *actual* board container height and width. The container
  // grows/shrinks with the mobile browser's dynamic viewport (address bar).
  function fitBoard() {
    if (!level || !tiles.length) return;
    const container = board.parentElement;
    const availableWidth = container.clientWidth;
    const availableHeight = container.clientHeight;
    if (availableWidth < 2 || availableHeight < 2) return;
    const aspect = level.width / level.height;
    const width = Math.floor(Math.min(availableWidth, availableHeight * aspect));
    const height = Math.floor(width / aspect);
    board.style.width = `${width}px`;
    board.style.height = `${height}px`;
    measureFin();
  }

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
    } else {
      msg.textContent = allCollected ? 'All treasures found! Swim to the golden X.' : statusMessage;
      msg.classList.remove('is-won');
    }
    measureFin();
  }

  function makeBoard() {
    board.replaceChildren();
    board.style.setProperty('--cols',String(level.width));
    board.style.setProperty('--rows',String(level.height));
    visualAssets.applyBoard(board,level.environment);
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
        gem.innerHTML=visualAssets.sprite('treasure',level.environment,TREASURE_SVG);
        tile.append(gem);
      }
      visualAssets.decorateTile(tile,visualAssets.terrainFor(level,id,blocked.has(id)),id===level.start?'start':id===level.goal?'goal':null,level.environment);
      board.append(tile);
      tiles.push(tile);
    }
    fin=document.createElement('div');
    fin.className='th-fin th-fin-initial';
    fin.setAttribute('aria-hidden','true');
    fin.innerHTML=visualAssets.sprite('fin',level.environment,FIN_SVG);
    board.append(fin);
    fitBoard();
    // Do not animate in from (0,0) when starting or restarting a level.
    const createdFin = fin;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (createdFin.isConnected) createdFin.classList.remove('th-fin-initial');
    }));
  }

  function cancelPendingMoves() {
    if (moveTimer !== null) clearTimeout(moveTimer);
    moveTimer = null;
    pendingMoves = [];
    animating = false;
  }

  function leaveLevel(){
    // Leaving the map mid-move must cancel all queued movement, not let a
    // hidden board finish and secretly grant progress in the background.
    // If the victory animation is still pending, keep the board until its
    // completion event has been safely saved by the campaign controller.
    if(state?.completed&&victoryTimer!==null)return false;
    idlePeek.cancel();
    cancelPendingMoves();
    if(victoryTimer!==null){clearTimeout(victoryTimer);victoryTimer=null;}
    return true;
  }

  function selectLevel(index) {
    if(!Number.isInteger(index)||index<0||index>=levels.length) return;
    if(!window.PathleTreasureCampaign?.canEnter(index))return;
    idlePeek.cancel();
    const chosen=levels[index];
    const validation=engine.validateLevel(chosen);
    if(!validation.valid) throw new Error(`Invalid Treasure Hunt level ${index+1}: ${validation.errors.join('; ')}`);
    if (pointerId !== null && board.hasPointerCapture(pointerId)) {
      try { board.releasePointerCapture(pointerId); } catch (_error) {}
    }
    pointerId=null;
    lastPoint=null;
    cancelPendingMoves();
    if (victoryTimer !== null) clearTimeout(victoryTimer);
    victoryTimer = null;
    document.dispatchEvent(new CustomEvent('pathle:treasure-level-change', {detail:{levelId:chosen.id}}));
    levelIndex=index;
    level=chosen;
    state=engine.createRun(level);
    blocked = new Set(level.blocked);
    makeBoard();
    update();
    idlePeek.reset();
  }

  function plannedPosition() {
    return pendingMoves.length ? pendingMoves[pendingMoves.length - 1] : state.position;
  }

  function processPendingMoves() {
    if (animating || document.hidden || pendingMoves.length === 0) return;
    const to = pendingMoves.shift();
    const result = engine.applyAction(level, state, {type:'move', to});
    if (!result.accepted) {
      // Defensive stop: a future rule should never leave a stale gesture queued.
      pendingMoves = [];
      return;
    }
    state = result.state;
    update();
    if (state.completed) {
      idlePeek.cancel();
      pendingMoves = [];
      // Let the 80ms fin motion reach the goal before presenting results.
      // A level switch or restart cancels this timer.
      const completedLevel = level;
      const completedRun = state;
      const completedIndex = levelIndex;
      victoryTimer = setTimeout(() => {
        victoryTimer = null;
        if (level === completedLevel && state === completedRun && state.completed) {
          document.dispatchEvent(new CustomEvent('pathle:treasure-complete', {
            detail: {level:completedLevel, run:completedRun, levelIndex:completedIndex}
          }));
        }
      }, MOVE_MS + 220);
    }
    animating = true;
    moveTimer = setTimeout(() => {
      moveTimer = null;
      animating = false;
      processPendingMoves();
      if(!animating&&!pendingMoves.length&&!state.completed)idlePeek.reset();
    }, MOVE_MS);
  }

  function enqueueMove(to) {
    if (state.completed || pendingMoves.length >= MAX_PENDING_MOVES) return false;
    const from = plannedPosition();
    const fromX = from % level.width;
    const fromY = Math.floor(from / level.width);
    const toX = to % level.width;
    const toY = Math.floor(to / level.width);
    if (!Number.isInteger(to) || to < 0 || to >= level.width * level.height ||
        Math.abs(fromX - toX) + Math.abs(fromY - toY) !== 1 || blocked.has(to)) return false;
    idlePeek.cancel();
    pendingMoves.push(to);
    processPendingMoves();
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
      if(state.completed || pendingMoves.length >= MAX_PENDING_MOVES) break;
      const x=a.x+(b.x-a.x)*i/steps;
      const y=a.y+(b.y-a.y)*i/steps;
      const id=cellAtPoint(x,y);
      const from = plannedPosition();
      if(id===null||id===from) continue;
      const sx=from%level.width,sy=Math.floor(from/level.width);
      const tx=id%level.width,ty=Math.floor(id/level.width);
      if(Math.abs(sx-tx)+Math.abs(sy-ty)===1) enqueueMove(id);
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
    if(target!==null) enqueueMove(target);
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
    const from = plannedPosition();
    const dx = dir==='right'?1:dir==='left'?-1:0;
    const dy = dir==='down'?1:dir==='up'?-1:0;
    const x = from%level.width + dx;
    const y = Math.floor(from/level.width) + dy;
    if (x>=0 && x<level.width && y>=0 && y<level.height) enqueueMove(y*level.width+x);
  });
  $('thRestart').addEventListener('click',()=>selectLevel(levelIndex));
  if('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(fitBoard);
    resizeObserver.observe(board.parentElement);
  }
  window.addEventListener('resize', fitBoard);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitBoard);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) processPendingMoves();
  });
  window.PathleTreasureUI=Object.freeze({selectLevel,fitBoard,leaveLevel,getCurrentLevel:()=>levelIndex});
  // The map opens a level after shared progress has been loaded and verified.
})();
