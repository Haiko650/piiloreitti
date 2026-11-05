/* TH.6A.1 – v2 Treasure Hunt storage boundary.
 * Pure on import: no DB reads or writes until the future v2 game calls it.
 * Preserve extensions.treasureHunt (retired v1), Daily progress and collection.
 */
(function(root){
  'use strict';
  function dependencies(){
    if(root&&root.PathleTreasureProgressV2&&root.PathleTreasureWorlds)
      return {model:root.PathleTreasureProgressV2,worlds:root.PathleTreasureWorlds};
    if(typeof module==='object'&&module.exports&&typeof require==='function')
      return {model:require('./treasure-progress-v2.js'),worlds:require('./treasure-worlds.js')};
    throw new Error('TH.6A.1 storage requires worlds and progress v2');
  }
  function fromSave(data,catalog){
    const {model,worlds}=dependencies();
    worlds.assertValid(catalog);
    if(!data||!data.extensions||typeof data.extensions!=='object'||
       Array.isArray(data.extensions))throw new TypeError('Invalid shared Pathle extensions');
    const raw=data.extensions[model.KEY];
    const progress=raw===undefined?model.empty():raw;
    const validation=model.validate(progress,catalog);
    if(!validation.valid)throw new Error('Refusing invalid Treasure Hunt v2 data: '+validation.errors.join('; '));
    return progress;
  }
  async function load(storage,catalog){
    if(!storage||typeof storage.load!=='function')throw new TypeError('Missing storage');
    const snapshot=await storage.load();
    return snapshot===null?{progress:dependencies().model.empty(),needsInitialSave:true}:
      {progress:fromSave(snapshot.data,catalog),needsInitialSave:false};
  }
  async function commitBest(storage,catalog,levelId,moves,optimalMoves,awardFins){
    if(!storage||typeof storage.update!=='function')throw new TypeError('Missing atomic save updater');
    const {model}=dependencies();
    let result=null;
    await storage.update(draft=>{
      // PathleStorage.update handles the latest snapshot atomically. No
      // stale whole-save copy can clobber a newer Daily Adventure result.
      const current=fromSave(draft,catalog);
      result=model.recordBest(current,catalog,levelId,moves,optimalMoves,awardFins);
      if(result.improved)draft.extensions[model.KEY]=result.progress;
      return draft;
    });
    return result;
  }
  const api=Object.freeze({fromSave,load,commitBest});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureSaveV2=api;
})(typeof window!=='undefined'?window:null);
