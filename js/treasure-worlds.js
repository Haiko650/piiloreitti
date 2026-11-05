/* Pathle TH.6A.1 – expandable worlds -> areas -> puzzle levels.
 * Definitions only: no UI override and no writes to stored game data.
 * New story content must get new stable IDs; never reuse retired TH.5 IDs.
 */
(function(root){
  'use strict';
  const VERSION=1;
  const MODES=Object.freeze(['surface','underwater']);
  const freezeLevel=value=>Object.freeze({...value,
    blocked:Object.freeze([...value.blocked]),
    treasures:Object.freeze([...value.treasures]),
    effects:Object.freeze([...value.effects])});
  // Three actual, deterministic tutorial board definitions. Their lessons
  // and UI are a future milestone; TH.6A.1 does not make them player-facing.
  const TUTORIAL_LEVELS=Object.freeze([
    freezeLevel({id:'th-tutorial-001',engineVersion:1,environment:'coast',width:4,height:4,
      start:12,goal:3,blocked:[],treasures:[13],effects:[]}),
    freezeLevel({id:'th-tutorial-002',engineVersion:1,environment:'coast',width:5,height:5,
      start:20,goal:4,blocked:[],treasures:[13,21],effects:[]}),
    freezeLevel({id:'th-tutorial-003',engineVersion:1,environment:'coast',width:6,height:6,
      start:30,goal:5,blocked:[12,13,18,19,24],treasures:[10,16,25],effects:[]})
  ]);
  const TUTORIAL_LESSONS=Object.freeze([
    Object.freeze({levelId:'th-tutorial-001',topic:'movement',hint:'Move to an adjacent tile, collect the treasure and reach X.'}),
    Object.freeze({levelId:'th-tutorial-002',topic:'multiple-treasures',hint:'Collect every treasure before reaching X.'}),
    Object.freeze({levelId:'th-tutorial-003',topic:'obstacles-and-fins',hint:'Avoid coral. Fewer moves earn better fins.'})
  ]);
  const WORLDS=Object.freeze([
    Object.freeze({id:'water-world',title:'Water World',status:'active',sort:1,
      mapMode:'geographic',description:'A growing connected world of seas, rivers and lakes.'}),
    Object.freeze({id:'space-adventure',title:'Space Adventure',status:'future',sort:2,
      mapMode:'geographic',description:'A future world; no levels published yet.'})
  ]);
  // Initial planned areas. Add many more later without changing the parser,
  // save format, world count or existing level identifiers.
  function plannedArea(id,title,sort,requires,mechanic,visualMode){
    return Object.freeze({id,worldId:'water-world',title,sort,
      targetLevelCount:60,status:'planned',levelIds:Object.freeze([]),
      unlock:Object.freeze({afterAreaId:requires,minimumFins:0}),
      map:Object.freeze({mode:'vertical-scroll',artStyle:'2.5d',sectionTarget:10,
        nodes:Object.freeze({})}),
      visualMode,visualOverrides:Object.freeze({}),featureAtEnd:mechanic});
  }
  const AREAS=Object.freeze([
    plannedArea('coral-coast','Coral Coast',1,'tutorial','currents','surface'),
    plannedArea('tropical-islands','Tropical Islands',2,'coral-coast','tides','surface'),
    plannedArea('open-ocean','Open Ocean',3,'tropical-islands','whirlpools','surface')
  ]);
  const TUTORIAL=Object.freeze({id:'tutorial',worldId:'water-world',title:'Haiko\'s First Steps',
    status:'ready-for-ui',visualMode:'surface',visualOverrides:Object.freeze({}),
    levelIds:Object.freeze(TUTORIAL_LEVELS.map(level=>level.id))});
  const DEFAULT_CATALOG=Object.freeze({version:VERSION,worlds:WORLDS,areas:AREAS,
    tutorial:TUTORIAL,tutorialLevels:TUTORIAL_LEVELS});

  const safeId=value=>typeof value==='string'&&
    /^[a-z][a-z0-9-]{0,63}$/.test(value);
  function validate(catalog){
    const errors=[];
    if(!catalog||catalog.version!==VERSION)return {valid:false,errors:['Unsupported catalog version']};
    const {worlds,areas,tutorial,tutorialLevels}=catalog;
    if(!Array.isArray(worlds)||!Array.isArray(areas)||!tutorial||
       !Array.isArray(tutorialLevels))return {valid:false,errors:['Invalid catalog structure']};
    const worldIds=new Set(),worldOrders=new Set(),areaIds=new Set(),levelIds=new Set();
    for(const w of worlds){
      if(!w||!safeId(w.id)||worldIds.has(w.id)||!Number.isSafeInteger(w.sort)||w.sort<1||
         worldOrders.has(w.sort)||!['active','future'].includes(w.status))
        errors.push('Invalid or duplicate world');
      else {worldIds.add(w.id);worldOrders.add(w.sort);}
    }
    if(!safeId(tutorial.id)||!worldIds.has(tutorial.worldId)||tutorial.id!=='tutorial'||
       tutorialLevels.length!==3||!Array.isArray(tutorial.levelIds)||
       tutorial.levelIds.length!==tutorialLevels.length)errors.push('Invalid tutorial');
    for(let i=0;i<tutorialLevels.length;i++){
      const level=tutorialLevels[i];
      if(!level||typeof level.id!=='string'||levelIds.has(level.id)||
        level.id!==tutorial.levelIds[i])errors.push('Invalid tutorial level identity');
      else levelIds.add(level.id);
    }
    const areaOrders=new Set();
    for(const area of areas){
      if(!area||!safeId(area.id)||area.id==='tutorial'||areaIds.has(area.id)||
         !worldIds.has(area.worldId)||!Number.isSafeInteger(area.sort)||area.sort<1||
         areaOrders.has(area.worldId+':'+area.sort)||
         !Number.isSafeInteger(area.targetLevelCount)||area.targetLevelCount<1||
         !['planned','released'].includes(area.status)||!Array.isArray(area.levelIds)||
         area.levelIds.length>area.targetLevelCount||!MODES.includes(area.visualMode)||
         !area.map||area.map.mode!=='vertical-scroll'||
         !area.unlock||!Number.isSafeInteger(area.unlock.minimumFins)||
         area.unlock.minimumFins<0) {
        errors.push('Invalid area');
        continue;
      }
      areaOrders.add(area.worldId+':'+area.sort);
      areaIds.add(area.id);
      for(const id of area.levelIds){
        if(typeof id!=='string'||!id.startsWith('th-')||id.length>128||levelIds.has(id))
          errors.push('Invalid or duplicate area level ID');
        else levelIds.add(id);
      }
      if(area.status==='released'&&area.levelIds.length===0)
        errors.push('Released area must contain a playable level');
      const overrides=area.visualOverrides||{};
      if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)||
         Object.entries(overrides).some(([id,mode])=>!area.levelIds.includes(id)||!MODES.includes(mode)))
        errors.push('Invalid per-level visual mode for '+area.id);
      const nodes=area.map.nodes||{};
      if(!nodes||typeof nodes!=='object'||Array.isArray(nodes)||
         Object.entries(nodes).some(([id,node])=>!area.levelIds.includes(id)||!node||
           !safeId(node.sectionId)||typeof node.x!=='number'||typeof node.y!=='number'||
           !Number.isFinite(node.x)||!Number.isFinite(node.y)||
           node.x<0||node.x>1||node.y<0||node.y>1))
        errors.push('Invalid map node position for '+area.id);
    }
    for(const area of areas){
      const predecessor=area.unlock?.afterAreaId;
      if(predecessor!=='tutorial'&&!areaIds.has(predecessor))
        errors.push('Unknown prerequisite for '+area.id);
      else if(predecessor!=='tutorial'){
        const prior=areas.find(x=>x.id===predecessor);
        if(prior&&prior.worldId!==area.worldId)errors.push('Prerequisite crosses worlds');
        if(prior&&prior.sort>=area.sort)errors.push('Prerequisite must precede area');
      }
    }
    return {valid:errors.length===0,errors};
  }
  function assertValid(catalog){
    const result=validate(catalog);
    if(!result.valid)throw new TypeError('Invalid Treasure Hunt catalog: '+result.errors.join('; '));
    return catalog;
  }
  function getWorld(catalog,id){
    assertValid(catalog);
    return catalog.worlds.find(world=>world.id===id)||null;
  }
  function getAreas(catalog,worldId){
    assertValid(catalog);
    return catalog.areas.filter(area=>area.worldId===worldId).sort((a,b)=>a.sort-b.sort);
  }
  function playableIds(catalog){
    assertValid(catalog);
    const order=new Map(catalog.worlds.map(world=>[world.id,world.sort]));
    return [...catalog.tutorial.levelIds,
      ...catalog.areas.filter(area=>area.status==='released')
        .sort((a,b)=>order.get(a.worldId)-order.get(b.worldId)||a.sort-b.sort)
        .flatMap(area=>area.levelIds)];
  }
  function getStage(catalog,levelId){
    assertValid(catalog);
    if(catalog.tutorial.levelIds.includes(levelId))
      return {worldId:catalog.tutorial.worldId,areaId:'tutorial',
        position:catalog.tutorial.levelIds.indexOf(levelId),visualMode:'surface'};
    const area=catalog.areas.find(item=>item.levelIds.includes(levelId));
    return area?{worldId:area.worldId,areaId:area.id,
      position:area.levelIds.indexOf(levelId),
      visualMode:area.visualOverrides?.[levelId]||area.visualMode,
      mapNode:area.map.nodes?.[levelId]||null}:null;
  }
  assertValid(DEFAULT_CATALOG);
  const api=Object.freeze({VERSION,MODES,DEFAULT_CATALOG,
    TUTORIAL_LEVELS,TUTORIAL_LESSONS,getWorld,getAreas,playableIds,getStage,
    validate,assertValid});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureWorlds=api;
})(typeof window!=='undefined'?window:null);
