/* TH.5A Treasure Hunt progression, immutable and independent of the DOM.
 * The optional IndexedDB extension is keyed by stable generated level IDs.
 * Best moves are the only recorded award: fin medals are derived from them.
 * Browser: window.PathleTreasureProgress; Node: require('./treasure-progress.js').
 */
(function(root){
  'use strict';
  const VERSION=1;
  const KEY='treasureHunt';
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
    (Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null);
  function empty(seed,generatorVersion){
    if(typeof seed!=='string'||!seed.length||!Number.isInteger(generatorVersion))throw new TypeError('Invalid campaign identity');
    return {version:VERSION,seed,generatorVersion,records:{}};
  }
  function validate(progress,levels,seed,generatorVersion,optimal){
    const errors=[];
    if(!plain(progress))return {valid:false,errors:['Treasure progress must be an object']};
    if(progress.version!==VERSION)errors.push('Unsupported Treasure Hunt progress version');
    if(progress.generatorVersion!==generatorVersion||progress.seed!==seed)errors.push('Treasure Hunt campaign identity changed');
    if(!plain(progress.records))errors.push('Invalid Treasure Hunt records');
    if(!Array.isArray(levels)||!levels.length)errors.push('Missing Treasure Hunt levels');
    if(errors.length)return {valid:false,errors};
    if(Object.keys(progress.records).length>levels.length)errors.push('Too many Treasure Hunt completion records');
    let gap=false;
    for(let i=0;i<levels.length;i++){
      const record=progress.records[levels[i].id];
      if(record===undefined){gap=true;continue;}
      if(gap)errors.push('Completion records contain a locked-level gap at '+(i+1));
      if(!plain(record)||!Number.isSafeInteger(record.bestMoves)||record.bestMoves<1||
        Object.keys(record).length!==1)errors.push('Invalid best score at '+(i+1));
      else if(typeof optimal==='function'&&record.bestMoves<optimal(levels[i]))errors.push('Impossible best score at '+(i+1));
    }
    const recognized=new Set(levels.map(x=>x.id));
    for(const key of Object.keys(progress.records)){
      if(!recognized.has(key))errors.push('Unknown Treasure Hunt level record');
    }
    return {valid:errors.length===0,errors};
  }
  function completedCount(progress,levels){
    if(!progress||!plain(progress.records))throw new TypeError('Invalid Treasure Hunt progress');
    let cleared=0;
    for(const l of levels){
      if(!own(progress.records,l.id))break;
      cleared++;
    }
    return cleared;
  }
  function canEnter(progress,levels,index){
    return Number.isInteger(index)&&index>=0&&index<levels.length&&index<=completedCount(progress,levels);
  }
  function bestFor(progress,level){
    const record=progress.records[level.id];
    return record===undefined?null:record.bestMoves;
  }
  function recordCompletion(progress,levels,index,score,expectedOptimum,seed,generatorVersion){
    const status=validate(progress,levels,seed,generatorVersion);
    if(!status.valid)throw new Error('Refusing invalid Treasure Hunt progress: '+status.errors.join('; '));
    if(!canEnter(progress,levels,index))throw new Error('Treasure Hunt level is locked');
    if(!Number.isSafeInteger(score)||score<1||!Number.isSafeInteger(expectedOptimum)||
      expectedOptimum<1||score<expectedOptimum)throw new RangeError('Invalid or impossible Treasure Hunt score');
    const id=levels[index].id,previous=bestFor(progress,levels[index]);
    const firstClear=previous===null;
    const improved=firstClear||score<previous;
    if(!improved)return {progress,firstClear:false,improved:false,previousBest:previous,bestMoves:previous};
    const records={...progress.records,[id]:{bestMoves:score}};
    const next={version:VERSION,seed,generatorVersion,records};
    return {progress:next,firstClear,improved,previousBest:previous,bestMoves:score};
  }
  const api=Object.freeze({VERSION,KEY,empty,validate,completedCount,canEnter,bestFor,recordCompletion});
  if(root)root.PathleTreasureProgress=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
