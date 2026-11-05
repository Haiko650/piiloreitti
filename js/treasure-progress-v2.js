/* Pathle TH.6A.1 – clean campaign-v2 progress, separate from retired TH.5.
 * Player records use stable IDs and are never tied to the map artwork.
 * This module does NOT touch IndexedDB. The rollout will persist it under
 * extensions.treasureHuntV2, leaving extensions.treasureHunt untouched.
 */
(function(root){
  'use strict';
  const VERSION=2;
  const KEY='treasureHuntV2';
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
    (Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null);
  const getWorlds=()=>{
    if(root&&root.PathleTreasureWorlds)return root.PathleTreasureWorlds;
    if(typeof module==='object'&&module.exports&&typeof require==='function')
      return require('./treasure-worlds.js');
    throw new Error('Treasure world catalog must be loaded first');
  };
  const assertCatalog=catalog=>getWorlds().assertValid(catalog);
  const allIds=catalog=>getWorlds().playableIds(catalog);
  const area=(catalog,id)=>catalog.areas.find(item=>item.id===id)||null;
  function empty(){
    return {version:VERSION,records:{},unlockedAreas:[]};
  }
  function validate(value,catalog){
    assertCatalog(catalog);
    const errors=[];
    if(!plain(value)||value.version!==VERSION||!plain(value.records)||
       !Array.isArray(value.unlockedAreas)){
      return {valid:false,errors:['Invalid Treasure Hunt v2 progress structure']};
    }
    const ids=allIds(catalog),allowed=new Set(ids),completed=new Set();
    for(const [id,record] of Object.entries(value.records)){
      if(!allowed.has(id)||!plain(record)||Object.keys(record).length!==1||
         !Number.isSafeInteger(record.bestMoves)||record.bestMoves<1)
        errors.push('Unknown or invalid completed level: '+id);
      else completed.add(id);
    }
    let encounteredGap=false;
    for(const id of ids){
      if(!completed.has(id))encounteredGap=true;
      else if(encounteredGap)errors.push('Skipped a locked stage: '+id);
    }
    const knownAreas=new Set(catalog.areas.map(item=>item.id));
    const seen=new Set();
    for(const areaId of value.unlockedAreas){
      if(typeof areaId!=='string'||!knownAreas.has(areaId)||seen.has(areaId))
        errors.push('Unknown or duplicate unlocked area');
      seen.add(areaId);
    }
    return {valid:errors.length===0,errors};
  }
  function assertProgress(value,catalog){
    const result=validate(value,catalog);
    if(!result.valid)throw new TypeError('Unsafe Treasure Hunt v2 progress: '+result.errors.join('; '));
    return value;
  }
  function completed(value,ids){
    return ids.every(id=>own(value.records,id));
  }
  function earnedFins(value,levelIds,awardFins){
    let sum=0;
    for(const id of levelIds){
      const record=value.records[id];
      if(!record)continue;
      if(typeof awardFins!=='function')throw new TypeError('Fin grading is required');
      const fins=awardFins(id,record.bestMoves);
      if(!Number.isInteger(fins)||fins<1||fins>3)
        throw new RangeError('Grading must award 1, 2 or 3 fins');
      sum+=fins;
    }
    return sum;
  }
  function areaAccess(value,catalog,areaId,awardFins){
    assertProgress(value,catalog);
    const next=area(catalog,areaId);
    if(!next)return {available:false,reason:'unknown-area'};
    if(next.status!=='released')return {available:false,reason:'unpublished'};
    // Permanent award: changing fin thresholds must not relock an area.
    if(value.unlockedAreas.includes(areaId))return {available:true,reason:'previously-unlocked'};
    const prerequisite=next.unlock.afterAreaId;
    const prior=prerequisite==='tutorial'?catalog.tutorial:area(catalog,prerequisite);
    if(!prior||prior.status==='planned'||!completed(value,prior.levelIds))
      return {available:false,reason:'previous-area-incomplete'};
    const required=next.unlock.minimumFins;
    if(required>0){
      const fins=earnedFins(value,prior.levelIds,awardFins);
      if(fins<required)return {available:false,reason:'insufficient-fins',
        requiredFins:required,currentFins:fins};
    }
    return {available:true,reason:'requirements-met'};
  }
  function canPlay(value,catalog,levelId,awardFins){
    assertProgress(value,catalog);
    const worlds=getWorlds();
    const stage=worlds.getStage(catalog,levelId);
    if(!stage)return false;
    if(own(value.records,levelId))return true;
    if(stage.areaId==='tutorial')
      return completed(value,catalog.tutorial.levelIds.slice(0,stage.position));
    if(!areaAccess(value,catalog,stage.areaId,awardFins).available)return false;
    const source=area(catalog,stage.areaId);
    return completed(value,source.levelIds.slice(0,stage.position));
  }
  function recordBest(value,catalog,levelId,moves,optimalMoves,awardFins){
    assertProgress(value,catalog);
    if(!Number.isSafeInteger(moves)||moves<1||
       !Number.isSafeInteger(optimalMoves)||optimalMoves<1||moves<optimalMoves)
      throw new RangeError('Invalid or impossible Treasure Hunt v2 score');
    if(!canPlay(value,catalog,levelId,awardFins))
      throw new Error('Level is locked or not published');
    const previous=value.records[levelId]?.bestMoves??null;
    if(previous!==null&&previous<=moves)
      return {progress:value,firstClear:false,improved:false,previousBest:previous};
    let next={
      version:VERSION,
      records:{...value.records,[levelId]:{bestMoves:moves}},
      unlockedAreas:[...value.unlockedAreas]
    };
    // Persist unlocks when they are earned, including replays that improve
    // fin scores. A later rule change cannot retroactively revoke access.
    const worlds=getWorlds();
    const ordered=catalog.worlds.slice().sort((a,b)=>a.sort-b.sort)
      .flatMap(world=>worlds.getAreas(catalog,world.id));
    for(const item of ordered){
      if(!next.unlockedAreas.includes(item.id)&&
         areaAccess(next,catalog,item.id,awardFins).available){
        next={...next,unlockedAreas:[...next.unlockedAreas,item.id]};
      }
    }
    return {progress:next,firstClear:previous===null,improved:true,previousBest:previous};
  }
  const api=Object.freeze({VERSION,KEY,empty,validate,completed,
    earnedFins,areaAccess,canPlay,recordBest});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureProgressV2=api;
})(typeof window!=='undefined'?window:null);
