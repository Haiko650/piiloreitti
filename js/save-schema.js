/* Pathle 5B.3B.1 — versioned, validated save model.
   New chapter and reward IDs remain data-driven; schema version is still 1. */
(()=>{'use strict';
  const VERSION=1;
  const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const isMap=value=>isObject(value)&&Object.prototype.toString.call(value)==='[object Object]';

  // Stable IDs (e.g. ocean-01, ocean-02) can be added as chapters arrive.
  function createEmptySave(){
    return {
      schemaVersion:VERSION,
      progress:{chapters:{},activeChallenge:null,history:[]},
      collection:{items:{},hideout:{chests:{}}},
      settings:{sound:true,music:true,ambient:true},
      guides:{seen:{}},
      extensions:{}
    };
  }

  // Structural checks are independent of the prize catalogue and future
  // chapter content: adding a new chapter or reward does not change v1.
  const GRID_SIZES=[6,8,10];
  const safeId=id=>typeof id==='string'&&id.length>0&&id.length<=128&&
    /^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(id)&&
    !['__proto__','constructor','prototype'].includes(id);
  const safeInteger=n=>Number.isSafeInteger(n)&&n>=0;
  const idFlags=map=>isMap(map)&&Object.entries(map).every(([id,value])=>safeId(id)&&value===true);
  const guideFlags=map=>isMap(map)&&Object.entries(map).every(([id,value])=>safeId(id)&&typeof value==='boolean');
  const validTile=(id,size)=>Number.isInteger(id)&&id>=0&&id<size*size;
  function validBoard(board,size){
    if(!isObject(board)||!Array.isArray(board.path)||!Array.isArray(board.pearls)||!Array.isArray(board.blocks))return false;
    const path=board.path;
    if(path.length<2||path.length>size*size||path[0]!==0||path[path.length-1]!==size*size-1)return false;
    const visited=new Set(path);
    if(visited.size!==path.length||!path.every(id=>validTile(id,size)))return false;
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i];
      if(Math.abs(a%size-b%size)+Math.abs(Math.floor(a/size)-Math.floor(b/size))!==1)return false;
    }
    if(!board.pearls.every(id=>validTile(id,size)&&visited.has(id)&&id!==0&&id!==size*size-1)||
       new Set(board.pearls).size!==board.pearls.length)return false;
    if(!board.blocks.every(id=>validTile(id,size)&&!visited.has(id))||
       new Set(board.blocks).size!==board.blocks.length)return false;
    return true;
  }
  function validLevel(level,board,size){
    if(!isObject(level)||!safeInteger(level.attemptsUsed)||level.attemptsUsed>3||
       !safeInteger(level.clicks)||typeof level.completed!=='boolean'||
       !Array.isArray(level.attemptScores)||level.attemptScores.length!==level.attemptsUsed||
       !level.attemptScores.every(n=>safeInteger(n)&&n>=board.path.length-1)||
       !Array.isArray(level.visited)||level.visited.length<1||level.visited.length>board.path.length||
       !level.visited.every((id,i)=>id===board.path[i])||!isMap(level.wrongByStep))return false;
    if(!(level.bestClicks===null||safeInteger(level.bestClicks)))return false;
    if(level.bestClicks!==null&&level.bestClicks!==Math.min(...level.attemptScores))return false;
    for(const [step,tiles] of Object.entries(level.wrongByStep)){
      if(!/^(0|[1-9][0-9]*)$/.test(step)||Number(step)>=board.path.length-1||
         !Array.isArray(tiles)||!tiles.every(tile=>validTile(tile,size)))return false;
    }
    return true;
  }
  function validActiveRun(run){
    if(!isObject(run)||typeof run.date!=='string'||run.date.length>32||
       !Number.isInteger(run.day)||run.day<1||run.day>7||
       !Number.isInteger(run.activeLevel)||run.activeLevel<0||run.activeLevel>2||
       !Array.isArray(run.boards)||run.boards.length!==3||
       !Array.isArray(run.levels)||run.levels.length!==3)return false;
    for(let i=0;i<3;i++){
      const size=GRID_SIZES[i];
      if(!validBoard(run.boards[i],size)||!validLevel(run.levels[i],run.boards[i],size))return false;
    }
    return true;
  }
  function validChapterOne(daily){
    return isObject(daily)&&daily.version===1&&
      Number.isInteger(daily.completedDays)&&daily.completedDays>=0&&daily.completedDays<=7&&
      typeof daily.lastCompleteDate==='string'&&daily.lastCompleteDate.length<=32&&
      Array.isArray(daily.history)&&daily.history.every(item=>{
        if(!isObject(item)||typeof item.date!=='string'||!Number.isInteger(item.day)||
           item.day<1||item.day>7||!Array.isArray(item.best)||item.best.length!==3||
           !item.best.every(score=>score===null||safeInteger(score))||
           !Array.isArray(item.tries)||item.tries.length!==3||
           !item.tries.every(n=>safeInteger(n)&&n<=3))return false;
        return true;
      })&&
      (daily.active===null||validActiveRun(daily.active));
  }
  function validateSave(value){
    const errors=[];
    if(!isObject(value))return {valid:false,errors:['Save must be an object']};
    if(value.schemaVersion!==VERSION)errors.push(`Unsupported save schema version: ${String(value.schemaVersion)}`);
    if(!isObject(value.progress)||!isMap(value.progress.chapters)||!Array.isArray(value.progress.history)||
       !(value.progress.activeChallenge===null||isObject(value.progress.activeChallenge))){
      errors.push('Invalid progress');
    }else{
      if(!Object.entries(value.progress.chapters).every(([id,chapter])=>safeId(id)&&isObject(chapter)))errors.push('Invalid chapter IDs or data');
      const daily=value.progress.chapters['ocean-01'];
      if(daily!==undefined&&!validChapterOne(daily))errors.push('Invalid ocean-01 daily progress');
    }
    if(!isObject(value.collection)||!idFlags(value.collection.items)||!isMap(value.collection.hideout)){
      errors.push('Invalid collection');
    }else{
      // Older v1 records may have hideout:{} with no chest map yet.
      const chests=value.collection.hideout.chests;
      if(chests!==undefined&&!idFlags(chests))errors.push('Invalid chest states');
      if(chests?.['ocean-01']===true&&value.collection.items.luminous_pearl!==true)
        errors.push('Opened chapter chest is missing its reward');
    }
    if(!isObject(value.settings)||['sound','music','ambient'].some(k=>typeof value.settings[k]!=='boolean'))
      errors.push('Invalid settings');
    if(!isObject(value.guides)||!guideFlags(value.guides.seen))errors.push('Invalid guides');
    // Extensions remain intentionally open for future content and tests.
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
