/* Pathle shared visual catalog – artwork is independent of game rules.
 * Edit only ART.shared / ART.environments and upload images into images/skins/.
 * Null uses the original SVG/CSS drawing until approved art is available.
 * Browser: window.PathleVisualAssets; Node: require('./visual-assets.js').
 */
(function(root){
  'use strict';
  const ASSET_KEYS=Object.freeze(['water','coral','beach','forest','current','rock','wave','fin','finRear','start','goal','pearl','treasure','haikoPeek']);
  const TERRAINS=Object.freeze(['water','coral','beach','forest','current','rock']);
  const ART=Object.freeze({
    shared:Object.freeze({
      water:null,coral:null,beach:null,forest:null,current:null,rock:null,
      wave:null,fin:'images/skins/haiko-fin.webp',finRear:'images/skins/haiko-fin-rear.webp',start:null,goal:null,pearl:null,treasure:null,haikoPeek:null
    }),
    environments:Object.freeze({
      'coral-reef':Object.freeze({}),
      coast:Object.freeze({}),
      ocean:Object.freeze({}),
      river:Object.freeze({}),
      forest:Object.freeze({})
    })
  });
  const validPath=value=>typeof value==='string'&&/^images\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:webp|png|svg|avif)$/i.test(value);
  function getAsset(key,environment){
    if(!ASSET_KEYS.includes(key))return null;
    const specific=ART.environments[environment];
    const value=specific&&Object.prototype.hasOwnProperty.call(specific,key)?specific[key]:ART.shared[key];
    if(value===null||value===undefined)return null;
    if(!validPath(value))throw new Error('Invalid Pathle artwork path for '+key+': '+String(value));
    return value;
  }
  function applyBoard(board,environment){
    if(!board)return;
    board.classList.add('pa-board');
    board.dataset.artEnvironment=environment||'coral-reef';
    for(const key of ASSET_KEYS){
      const path=getAsset(key,environment);
      board.classList.toggle('pa-has-'+key,!!path);
      board.style.setProperty('--pa-'+key,path?'url("'+path+'")':'none');
    }
  }
  function terrainFor(level,id,blocked){
    // Purely visual metadata. Collision remains determined by the game engine.
    const override=level&&level.visualTerrain&&level.visualTerrain[id];
    if(TERRAINS.includes(override))return override;
    return blocked?'coral':'water';
  }
  function decorateTile(tile,terrain,feature,environment){
    if(!TERRAINS.includes(terrain))throw new Error('Unknown visual terrain '+terrain);
    tile.dataset.terrain=terrain;
    if(feature)tile.dataset.artFeature=feature;
    else delete tile.dataset.artFeature;
    if((terrain==='water'||terrain==='current')&&getAsset('wave',environment)&&typeof document!=='undefined'){
      const wave=document.createElement('span');
      wave.className='pa-wave';
      wave.setAttribute('aria-hidden','true');
      tile.append(wave);
    }
  }
  function sprite(key,environment,fallbackMarkup){
    const path=getAsset(key,environment);
    if(!path)return fallbackMarkup;
    return '<img class="pa-sprite pa-sprite-'+key+'" src="'+path+'" alt="" draggable="false">';
  }
  // Facing is computed from actual adjacent movement, never the tile's
  // absolute index alone (which would mistake row wraps for horizontal moves).
  function finDirection(from,to,width){
    if(!Number.isInteger(from)||!Number.isInteger(to)||!Number.isInteger(width)||
      width<1||from<0||to<0)return null;
    const dx=to%width-from%width;
    const dy=Math.floor(to/width)-Math.floor(from/width);
    if(dx===1&&dy===0)return 'right';
    if(dx===-1&&dy===0)return 'left';
    if(dx===0&&dy===-1)return 'up';
    if(dx===0&&dy===1)return 'down';
    return null;
  }
  // One side asset handles right/left; the approved rear view handles both
  // vertical directions. Replace image markup only when the art changes,
  // not on every animation frame; flip only the image, never the moving box.
  function setFinFacing(container,direction,environment,fallbackMarkup){
    if(!container)return;
    const facing=['right','left','up','down'].includes(direction)?direction:'right';
    const key=facing==='up'||facing==='down'?'finRear':'fin';
    if(container.dataset.finArt!==key){
      container.innerHTML=sprite(key,environment,fallbackMarkup);
      container.dataset.finArt=key;
    }
    container.dataset.finFacing=facing;
  }
  function createIdlePeek(options){
    const getTheme=options.theme;
    const anchor=options.anchor;
    const canShow=options.canShow;
    const delay=options.delayMs===undefined?3000:options.delayMs;
    let timer=null,peek=null,disposed=false;
    function cancel(){
      if(timer!==null){clearTimeout(timer);timer=null;}
      if(peek){
        const parent=peek.parentElement;
        peek.remove();
        if(parent)parent.classList.remove('pa-peek-anchor');
        peek=null;
      }
    }
    function reset(){
      cancel();
      if(disposed||!getAsset('haikoPeek',getTheme())||typeof document==='undefined'||document.hidden)return;
      timer=setTimeout(()=>{
        timer=null;
        if(disposed||document.hidden||!canShow()||
          (typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
        const target=anchor();
        const path=getAsset('haikoPeek',getTheme());
        if(!path||!target||!target.isConnected)return;
        const el=document.createElement('span');
        el.className='pa-idle-haiko';
        el.style.backgroundImage='url("'+path+'")';
        el.setAttribute('aria-hidden','true');
        target.classList.add('pa-peek-anchor');
        target.append(el);
        peek=el;
        el.addEventListener('animationend',()=>{
          if(peek!==el)return;
          peek=null;el.remove();target.classList.remove('pa-peek-anchor');
        },{once:true});
      },delay);
    }
    const visibility=()=>{if(document.hidden)cancel();else reset();};
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
    function dispose(){cancel();disposed=true;if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);}
    return Object.freeze({reset,cancel,dispose});
  }
  const api=Object.freeze({ART,ASSET_KEYS,TERRAINS,getAsset,applyBoard,terrainFor,decorateTile,sprite,finDirection,setFinFacing,createIdlePeek});
  if(root)root.PathleVisualAssets=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
