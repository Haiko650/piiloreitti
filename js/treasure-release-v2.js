/* TH.6A.2 – first playable Water World slice.
 * The release plan is deliberately separate from artwork and from the
 * retired 30-level generator campaign. New content is appended in order.
 */
(function(root){
  'use strict';
  function modules(){
    if(root&&root.PathleTreasureWorlds&&root.PathleTreasureGenerator)
      return {worlds:root.PathleTreasureWorlds,generator:root.PathleTreasureGenerator};
    if(typeof module==='object'&&module.exports&&typeof require==='function')
      return {worlds:require('./treasure-worlds.js'),generator:require('./treasure-generator.js')};
    throw new Error('Treasure world catalog and generator are required');
  }
  const {worlds,generator}=modules();
  const SEED='pathle-water-world-v2-20261105';
  const RELEASE_COUNT=4;
  const levels=Object.freeze(Array.from({length:RELEASE_COUNT},(_,index)=>{
    const generated=generator.generateLevel(index+1,SEED);
    return Object.freeze({...generated,
      id:'th-water-coral-'+String(index+1).padStart(3,'0'),
      environment:'coast',
      blocked:Object.freeze([...generated.blocked]),
      treasures:Object.freeze([...generated.treasures]),
      effects:Object.freeze([])});
  }));
  const nodes=Object.freeze(Object.fromEntries(levels.map((level,index)=>[
    level.id,
    Object.freeze({sectionId:'coral-shallows-01',
      x:[0.22,0.76,0.31,0.69][index],
      y:[0.11,0.34,0.61,0.86][index]})
  ])));
  const coral=Object.freeze({...worlds.DEFAULT_CATALOG.areas[0],
    status:'released',levelIds:Object.freeze(levels.map(level=>level.id)),
    map:Object.freeze({...worlds.DEFAULT_CATALOG.areas[0].map,nodes})});
  const catalog=Object.freeze({...worlds.DEFAULT_CATALOG,
    areas:Object.freeze([coral,...worlds.DEFAULT_CATALOG.areas.slice(1)])});
  worlds.assertValid(catalog);
  const list=Object.freeze([...worlds.TUTORIAL_LEVELS,...levels]);
  const getById=id=>list.find(item=>item.id===id)||null;
  const api=Object.freeze({SEED,RELEASE_COUNT,catalog,levels:list,getById});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureReleaseV2=api;
})(typeof window!=='undefined'?window:null);
