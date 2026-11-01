/* Pathle 5B.1 — future save model. Not yet connected to the game. */
(()=>{'use strict';
  const VERSION=1;
  const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const isMap=value=>isObject(value)&&Object.prototype.toString.call(value)==='[object Object]';

  // Stable IDs (e.g. ocean-01, ocean-02) can be added as chapters arrive.
  function createEmptySave(){
    return {
      schemaVersion:VERSION,
      progress:{chapters:{},activeChallenge:null,history:[]},
      collection:{items:{},hideout:{}},
      settings:{sound:true,music:true,ambient:true},
      guides:{seen:{}},
      extensions:{}
    };
  }

  function validateSave(value){
    const errors=[];
    if(!isObject(value))return {valid:false,errors:['Save must be an object']};
    if(value.schemaVersion!==VERSION)errors.push(`Unsupported save schema version: ${String(value.schemaVersion)}`);
    if(!isObject(value.progress)||!isMap(value.progress.chapters)||!Array.isArray(value.progress.history)||
       !(value.progress.activeChallenge===null||isObject(value.progress.activeChallenge)))errors.push('Invalid progress');
    if(!isObject(value.collection)||!isMap(value.collection.items)||!isMap(value.collection.hideout))errors.push('Invalid collection');
    if(!isObject(value.settings)||['sound','music','ambient'].some(k=>typeof value.settings[k]!=='boolean'))errors.push('Invalid settings');
    if(!isObject(value.guides)||!isMap(value.guides.seen))errors.push('Invalid guides');
    if(!isMap(value.extensions))errors.push('Invalid extensions');
    return {valid:errors.length===0,errors};
  }

  // Future migrations will be added here, one explicit source version at a time.
  // Refuse unknown versions rather than silently resetting progress.
  function migrateSave(value){
    const status=validateSave(value);
    if(!status.valid)throw new Error(`Pathle save is invalid: ${status.errors.join('; ')}`);
    return value;
  }

  // Export a read-only API to the page. No database is opened at startup.
  window.PathleSaveSchema=Object.freeze({VERSION,createEmptySave,validateSave,migrateSave});
})();
