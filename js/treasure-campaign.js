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
  const tabs=document.querySelector('.th-level-tabs');
  const note=document.querySelector('.th-footnote');
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
    tabs.hidden=true; // Campaign selects levels only on the adventure map.
    note.hidden=true;
    map.hidden=visible;
    mapButton.hidden=!visible;
  }
  function zoneName(index){return ['Coral Coast','Open Ocean','River Delta'][index]||'Ocean Journey';}
  function zoneClass(index){return ['coast','ocean','river'][index]||'ocean';}
  function medalName(score,level){
    const rating=grading.rateMoves(score,optimal(level));
    return {tier:rating.tier,fins:rating.fins};
  }
  function paintMap(){
    if(!progress)return;
    const cleared=progressModel.completedCount(progress,levels);
    summary.textContent=cleared===levels.length?'All 30 maps explored! Replay to improve your fins.':
      cleared+' / '+levels.length+' completed · Next: Level '+(cleared+1);
    regions.replaceChildren();
    const zoneCount=Math.ceil(levels.length/10);
    for(let z=0;z<zoneCount;z++){
      const section=document.createElement('section');
      section.className='th-map-zone th-map-'+zoneClass(z);
      section.setAttribute('aria-label',zoneName(z)+', levels '+(z*10+1)+' to '+Math.min(levels.length,(z+1)*10));
      const heading=document.createElement('div');heading.className='th-map-zone-heading';
      const title=document.createElement('h3');title.textContent=zoneName(z);
      const count=document.createElement('span');
      const local=levels.slice(z*10,(z+1)*10);
      const localDone=local.filter(level=>progressModel.bestFor(progress,level)!==null).length;
      count.textContent=localDone+' / '+local.length;
      heading.append(title,count);section.append(heading);
      const route=document.createElement('div');route.className='th-map-route';
      const trail=document.createElementNS('http://www.w3.org/2000/svg','svg');
      trail.setAttribute('viewBox','0 0 100 100');
      trail.setAttribute('preserveAspectRatio','none');
      trail.setAttribute('aria-hidden','true');
      trail.classList.add('th-map-trail');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M 10 28 C 18 21,22 36,30 28 S 42 20,50 28 S 62 36,70 28 S 82 20,90 28 Q 96 50,90 70 C 82 62,78 78,70 70 S 58 62,50 70 S 38 78,30 70 S 18 62,10 70');
      path.setAttribute('fill','none');
      path.setAttribute('stroke','currentColor');
      path.setAttribute('stroke-width','1.5');
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-dasharray','2.3 2.4');
      trail.append(path);route.append(trail);
      local.forEach((level,offset)=>{
        const index=z*10+offset;
        const record=progressModel.bestFor(progress,level);
        const unlocked=progressModel.canEnter(progress,levels,index);
        const current=unlocked&&record===null;
        const x=offset<5?10+offset*20:90-(offset-5)*20;
        const y=offset<5?28:70;
        const button=document.createElement('button');
        button.type='button';button.className='th-map-stop';
        button.classList.add(record!==null?'is-complete':current?'is-next':'is-locked');
        button.style.left=x+'%';button.style.top=y+'%';
        button.disabled=!unlocked;
        button.dataset.level=String(index+1);
        const numeral=document.createElement('strong');numeral.textContent=String(index+1);
        button.append(numeral);
        if(record!==null){
          const medal=medalName(record,level);
          button.classList.add('medal-'+medal.tier);
          const fin=document.createElement('span');fin.className='th-map-medal';
          fin.textContent='◢'.repeat(medal.fins);
          button.append(fin);
          button.setAttribute('aria-label','Level '+(index+1)+', completed, '+medal.fins+' '+medal.tier+' fins, best '+record+' moves');
        }else{
          button.setAttribute('aria-label','Level '+(index+1)+(current?', ready to play':', locked'));
          if(!current){const lock=document.createElement('small');lock.textContent='●';lock.setAttribute('aria-hidden','true');button.append(lock);}
        }
        if(current)button.setAttribute('aria-current','step');
        button.addEventListener('click',()=>openLevel(index));
        route.append(button);
      });
      section.append(route);
      regions.append(section);
    }
  }
  function showMap(){
    if(!ready||busy)return;
    clearError();shell.inert=false;
    setGameVisible(false);
    paintMap();
    const next=progressModel.completedCount(progress,levels);
    const target=map.querySelector('.is-next')||map.querySelector('.th-map-stop.is-complete:last-of-type');
    if(target&&next<levels.length)target.scrollIntoView({block:'nearest',behavior:'instant'});
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
