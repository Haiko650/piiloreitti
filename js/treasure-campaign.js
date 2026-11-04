/* TH.5A campaign UI and safe persistence.
 * Enabled ONLY by ?th5=1. Existing TH.3 and TH.4A previews remain unchanged.
 * All writes atomically mutate extensions.treasureHunt in PathleStorage.update;
 * we never write a stale copy of Daily Adventure, preferences or rewards.
 */
(function(root){
  'use strict';
  if(!root.PathleTreasureCampaignMode)return;
  const levels=root.PathleTreasureLevels;
  const generator=root.PathleTreasureGenerator;
  const progressModel=root.PathleTreasureProgress;
  const solver=root.PathleTreasureSolver;
  const grading=root.PathleTreasureGrading;
  const storage=root.PathleStorage;
  const schema=root.PathleSaveSchema;
  const ui=root.PathleTreasureUI;
  if(!levels||!generator||!progressModel||!solver||!grading||!storage||!schema||!ui){
    throw new Error('TH.5A requires progress, generator, solver, UI and save modules');
  }
  const $=id=>document.getElementById(id);
  const shell=document.querySelector('.th-shell');
  const boardPanel=document.querySelector('.th-panel');
  const map=$('thCampaignMap');
  const regions=$('thMapRegions');
  const summary=$('thMapSummary');
  const mapButton=$('thMapReturn');
  const mapWin=$('thWinMap');
  const errorBox=$('thCampaignError');
  const errorTitle=$('thCampaignErrorTitle');
  const errorText=$('thCampaignErrorText');
  const errorRetry=$('thCampaignRetry');
  const campaignSeed=generator.DEFAULT_SEED;
  const generatorVersion=generator.VERSION;
  let progress=null,ready=false,busy=false;
  const optimalCache=new Map();

  function optimal(level){
    let cached=optimalCache.get(level.id);
    if(cached===undefined){cached=solver.solve(level).optimalMoves;optimalCache.set(level.id,cached);}
    return cached;
  }
  function validate(value){
    return progressModel.validate(value,levels,campaignSeed,generatorVersion,optimal);
  }
  function assertValid(value){
    const check=validate(value);
    if(!check.valid)throw new Error('Treasure Hunt save cannot be used safely: '+check.errors.join('; '));
    return value;
  }
  function showError(title,error,retry){
    shell.inert=true;
    errorBox.hidden=false;
    errorTitle.textContent=title;
    errorText.textContent=error instanceof Error?error.message:String(error);
    errorRetry.disabled=false;
    errorRetry.onclick=async()=>{
      errorRetry.disabled=true;
      await retry();
      if(!errorBox.hidden)errorRetry.disabled=false;
    };
    errorRetry.focus();
  }
  function clearError(){errorBox.hidden=true;errorRetry.onclick=null;}
  function setGameVisible(visible){
    boardPanel.hidden=!visible;
    map.hidden=visible;
    mapButton.hidden=!visible;
  }
  // Presentation-only structure. Future illustrated region art can replace
  // these CSS backgrounds without changing level IDs, scores or unlocks.
  function zoneName(index){
    return ['Coral Coast','Open Ocean','River Delta','Kelp Forest'][index%4];
  }
  function medalName(score,level){
    const rating=grading.rateMoves(score,optimal(level));
    return {tier:rating.tier,fins:rating.fins};
  }
  function paintMap(){
    if(!progress)return;
    const cleared=progressModel.completedCount(progress,levels);
    summary.textContent=cleared===levels.length
      ? 'All '+levels.length+' levels complete · Replay to improve your scores!'
      : cleared+' / '+levels.length+' complete · Next level: '+(cleared+1);
    regions.replaceChildren();
    const zoneCount=Math.ceil(levels.length/10);
    for(let zone=0;zone<zoneCount;zone++){
      const first=zone*10,last=Math.min(levels.length,first+10);
      const section=document.createElement('section');
      section.className='th-map-zone';
      section.dataset.area=levels[first].environment;
      section.setAttribute('aria-label',zoneName(zone)+', levels '+(first+1)+' to '+last);
      const heading=document.createElement('div');
      heading.className='th-map-zone-heading';
      const title=document.createElement('h3');title.textContent=zoneName(zone);
      const count=document.createElement('span');
      count.textContent=levels.slice(first,last)
        .filter(item=>progressModel.bestFor(progress,item)!==null).length+' / '+(last-first);
      heading.append(title,count);section.append(heading);
      const grid=document.createElement('div');
      grid.className='th-map-grid';
      for(let index=first;index<last;index++){
        const level=levels[index],best=progressModel.bestFor(progress,level);
        const unlocked=progressModel.canEnter(progress,levels,index);
        const current=unlocked&&best===null;
        const button=document.createElement('button');
        button.type='button';button.className='th-map-level';
        button.classList.add(best!==null?'is-complete':current?'is-next':'is-locked');
        button.dataset.level=String(index+1);
        button.disabled=!unlocked;
        const number=document.createElement('strong');
        number.className='th-map-number';number.textContent=String(index+1);
        button.append(number);
        const label=document.createElement('small');
        label.className='th-map-status';
        if(best!==null){
          const medal=medalName(best,level);
          button.classList.add('medal-'+medal.tier);
          label.textContent=medal.fins+' fins';
          button.title='Personal best: '+best+' moves';
          button.setAttribute('aria-label','Level '+(index+1)+', completed, '+medal.fins+' '+medal.tier+' fins, best '+best+' moves');
        }else if(current){
          label.textContent='PLAY';
          button.setAttribute('aria-label','Level '+(index+1)+', ready to play');
          button.setAttribute('aria-current','step');
        }else{
          label.textContent='LOCKED';
          button.setAttribute('aria-label','Level '+(index+1)+', locked');
        }
        button.append(label);
        button.addEventListener('click',()=>openLevel(index));
        grid.append(button);
      }
      section.append(grid);regions.append(section);
    }
  }
  function showMap(){
    if(!ready||busy)return;
    clearError();shell.inert=false;
    if(typeof ui.leaveLevel==='function'&&ui.leaveLevel()===false)return;
    setGameVisible(false);
    paintMap();
    const next=progressModel.completedCount(progress,levels);
    const target=map.querySelector('.is-next')||map.querySelector('.th-map-level.is-complete:last-of-type');
    if(target&&next<levels.length&&typeof target.scrollIntoView==='function')target.scrollIntoView({block:'nearest',behavior:'auto'});
  }
  function openLevel(index){
    if(!ready||busy||!progressModel.canEnter(progress,levels,index))return;
    clearError();shell.inert=false;
    setGameVisible(true);
    ui.selectLevel(index);
    ui.fitBoard();
    requestAnimationFrame(()=>ui.fitBoard());
  }
  async function boot(){
    ready=false;shell.inert=true;
    setGameVisible(false);
    map.hidden=false;
    summary.textContent='Loading your Treasure Hunt progress…';
    try{
      let saved=await storage.load();
      if(saved===null){
        // Allow a direct link to Treasure Hunt before the player visits Daily.
        // This is the only new-save creation path; existing saves are never reset.
        await storage.save(schema.createEmptySave());
        saved=await storage.load();
        if(saved===null)throw new Error('Could not verify the newly created Pathle save');
      }
      const extension=saved.data.extensions[progressModel.KEY];
      progress=assertValid(extension===undefined?progressModel.empty(campaignSeed,generatorVersion):extension);
      ready=true;clearError();shell.inert=false;
      paintMap();showMap();
    }catch(error){
      ready=false;
      showError('Treasure Hunt progress could not be loaded',error,boot);
    }
  }
  async function handleCompletion(detail,showVictory){
    if(!ready||busy||!detail||typeof showVictory!=='function')return;
    const index=detail.levelIndex,level=levels[index];
    if(!level||detail.level!==level||!progressModel.canEnter(progress,levels,index))return;
    const check=root.PathleTreasureEngine.validateRun(level,detail.run);
    if(!check.valid||!detail.run.completed)return;
    const rating=grading.rateRun(level,detail.run);
    const oldBest=progressModel.bestFor(progress,level);
    const info={firstClear:oldBest===null,improved:oldBest===null||rating.score<oldBest,
      previousBest:oldBest,bestMoves:oldBest===null?rating.score:Math.min(oldBest,rating.score)};
    const persist=async()=>{
      if(busy)return;
      busy=true;shell.inert=true;errorRetry.disabled=true;
      try{
        // No redundant write on a replay with the same or worse score.
        if(info.improved){
          let savedResult=null;
          await storage.update(latest=>{
            const saved=latest.extensions[progressModel.KEY];
            const current=assertValid(saved===undefined?progressModel.empty(campaignSeed,generatorVersion):saved);
            savedResult=progressModel.recordCompletion(current,levels,index,rating.score,rating.optimalMoves,campaignSeed,generatorVersion);
            latest.extensions[progressModel.KEY]=savedResult.progress;
            return latest;
          });
          progress=savedResult.progress;
          info.firstClear=savedResult.firstClear;
          info.improved=savedResult.improved;
          info.previousBest=savedResult.previousBest;
          info.bestMoves=savedResult.bestMoves;
        }
        busy=false;clearError();shell.inert=false;paintMap();
        showVictory(info);
      }catch(error){
        busy=false;
        showError('Your Treasure Hunt result was not saved',error,persist);
      }
    };
    await persist();
  }
  root.PathleTreasureCampaign=Object.freeze({
    canEnter:index=>ready&&!busy&&progressModel.canEnter(progress,levels,index),
    getBest:id=>progress&&progress.records[id]?progress.records[id].bestMoves:null,
    handleCompletion,showMap,openLevel,
    isReady:()=>ready
  });
  mapButton.hidden=false;
  mapButton.addEventListener('click',showMap);
  mapWin.hidden=false;
  mapWin.addEventListener('click',()=>{
    $('thVictory').hidden=true;
    shell.inert=false;
    showMap();
  });
  boot();
})(window);
