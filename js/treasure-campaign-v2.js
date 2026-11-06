/* TH.6A.2 – new Treasure Hunt player-facing controller.
 * World overview + independently illustrated vertical area map + 3-step
 * first-run tutorial. No retired TH.5 IDs, maps or save records are loaded.
 * Drawing and gameplay data are intentionally separate.
 */
(function(root){
  'use strict';
  if(!root.PathleTreasureCampaignV2)return;
  const release=root.PathleTreasureReleaseV2;
  const worlds=root.PathleTreasureWorlds;
  const model=root.PathleTreasureProgressV2;
  const save=root.PathleTreasureSaveV2;
  const grading=root.PathleTreasureGrading;
  const solver=root.PathleTreasureSolver;
  const engine=root.PathleTreasureEngine;
  const ui=root.PathleTreasureUI;
  const storage=root.PathleStorage;
  const schema=root.PathleSaveSchema;
  const art=root.PathleTreasureMapArt;
  const layout=root.PathleTreasureMapLayout;
  if(!release||!worlds||!model||!save||!grading||!solver||!engine||
     !ui||!storage||!schema||!art||!layout)throw Error('Missing TH.6A.2 modules');
  const catalog=release.catalog,levels=release.levels;
  const $=id=>document.getElementById(id);
  const shell=document.querySelector('.th-shell');
  const panel=document.querySelector('.th-panel');
  const map=$('thCampaignMap');
  const tutorialView=$('thV2Tutorial');
  const tutorialTitle=$('thV2TutorialTitle');
  const tutorialSummary=$('thV2TutorialSummary');
  const tutorialStart=$('thV2TutorialStart');
  const worldView=$('thV2World');
  const worldCanvas=$('thV2WorldCanvas');
  const worldPins=$('thV2WorldPins');
  const areaView=$('thV2Area');
  const areaTitle=$('thV2AreaTitle');
  const areaSummary=$('thV2AreaSummary');
  const areaCanvas=$('thV2AreaCanvas');
  const mapButton=$('thMapReturn');
  const leaveDialog=$('thLeaveDialog'),leaveStay=$('thLeaveStay'),leaveConfirm=$('thLeaveConfirm');
  const errorBox=$('thCampaignError'),errorTitle=$('thCampaignErrorTitle');
  const errorText=$('thCampaignErrorText'),errorRetry=$('thCampaignRetry');
  const winMap=$('thWinMap');
  let progress=null,ready=false,busy=false,currentArea='coral-coast',boardIndex=-1,view='tutorial';
  const optimalCache=new Map();
  const optimal=level=>{
    if(!optimalCache.has(level.id))optimalCache.set(level.id,solver.solve(level).optimalMoves);
    return optimalCache.get(level.id);
  };
  const finsFor=(id,moves)=>{
    const level=release.getById(id);
    if(!level)throw new Error('No scoring definition for '+id);
    return grading.rateMoves(moves,optimal(level)).fins;
  };
  function canEnter(index){
    return ready&&!busy&&Number.isInteger(index)&&index>=0&&index<levels.length&&
      model.canPlay(progress,catalog,levels[index].id,finsFor);
  }
  function showError(title,err,retry){
    ready=false;
    shell.inert=true;errorBox.hidden=false;
    errorTitle.textContent=title;
    errorText.textContent=err instanceof Error?err.message:String(err);
    errorRetry.disabled=false;
    errorRetry.onclick=async()=>{
      errorRetry.disabled=true;
      await retry();
      if(!errorBox.hidden)errorRetry.disabled=false;
    };
    errorRetry.focus();
  }
  function hideError(){
    errorBox.hidden=true;errorRetry.onclick=null;shell.inert=false;
  }
  function showSection(which){
    view=which;
    map.hidden=false;panel.hidden=true;mapButton.hidden=true;
    tutorialView.hidden=which!=='tutorial';
    worldView.hidden=which!=='world';
    areaView.hidden=which!=='area';
    if(which==='world')renderWorld();
    if(which==='area')renderArea();
    if(which==='tutorial')renderTutorial();
  }
  function renderTutorial(){
    const cleared=catalog.tutorial.levelIds.filter(id=>Boolean(progress.records[id])).length;
    tutorialTitle.textContent=cleared===0?'Welcome, explorer!':'Great swimming, Haiko!';
    tutorialSummary.textContent=cleared+' / 3 lessons complete · '+
      (cleared<3?'Learn to move, collect treasures and avoid coral.':'Tutorial complete!');
    tutorialStart.textContent=cleared===0?'Start tutorial →':
      cleared<3?'Continue tutorial · '+(cleared+1)+' / 3 →':'Explore Water World →';
  }
  let currentWorldPin=null;
  let currentAreaNode=null;
  function renderWorld(){
    const world=worlds.getWorld(catalog,'water-world');
    $('thV2WorldTitle').textContent=world.title;
    worldPins.replaceChildren();
    currentWorldPin=null;
    const sectionNodes=new Map();
    // One separate, replaceable artwork panel per geographic section.
    // Both the artwork and the number of panels are data-driven.
    for(const section of art.worldSections(world.id)){
      const box=document.createElement('section');
      box.className='th-v2-world-section';
      box.dataset.sectionId=section.id;
      box.setAttribute('aria-label',section.label||'Water World map section: '+section.id);
      art.applyLayer(box,'--th-world-art',section.base);
      const picture=document.createElement('div');
      picture.className='th-v2-world-art';
      picture.setAttribute('aria-hidden','true');
      box.append(picture);
      worldPins.append(box);
      sectionNodes.set(section.id,box);
    }
    if(!sectionNodes.size)throw new Error('Water World has no map artwork sections');
    for(const area of worlds.getAreas(catalog,world.id)){
      const position=art.worldAreaPosition(world.id,area.id);
      const section=position&&sectionNodes.get(position.sectionId);
      if(!section||!Number.isFinite(position.x)||!Number.isFinite(position.y)||
         position.x<0||position.x>1||position.y<0||position.y>1){
        throw new Error('Missing valid map section/location for area '+area.id);
      }
      const access=model.areaAccess(progress,catalog,area.id,finsFor);
      const button=document.createElement('button');
      button.type='button';
      button.className='th-v2-world-pin';
      button.classList.add(access.available?'is-current':'is-locked');
      button.style.left=(position.x*100)+'%';
      button.style.top=(position.y*100)+'%';
      button.disabled=!access.available;
      button.textContent=area.title+(access.available?' · Explore':' · Soon');
      button.setAttribute('aria-label',area.title+(access.available?', explore area':', coming in a future update'));
      button.addEventListener('click',()=>openArea(area.id));
      section.append(button);
      if(access.available)currentWorldPin=button;
    }
    const done=catalog.tutorial.levelIds.every(id=>progress.records[id]);
    $('thV2WorldStatus').textContent=done
      ?'Swipe up or down to explore Water World. Tap an unlocked area.'
      :'Complete Haiko\'s 3 lessons before exploring.';
    // Return from a level to the player's active region instead of leaving
    // them stranded at the far northern edge of a future huge map.
    if(currentWorldPin&&typeof currentWorldPin.scrollIntoView==='function'){
      requestAnimationFrame(()=>currentWorldPin.scrollIntoView({block:'center',behavior:'auto'}));
    }
  }
  function renderArea(){
    const area=catalog.areas.find(item=>item.id===currentArea);
    if(!area||area.status!=='released')return;
    areaTitle.textContent=area.title;
    const cleared=area.levelIds.filter(id=>Boolean(progress.records[id])).length;
    const earned=model.earnedFins(progress,area.levelIds,finsFor);
    areaSummary.textContent=cleared+' / '+area.levelIds.length+
      ' playable levels complete · '+earned+' fins · Area goal: '+area.targetLevelCount+' levels';
    areaCanvas.replaceChildren();
    currentAreaNode=null;
    const sections=layout.getDisplaySections(area);
    const currentId=area.levelIds.find(id=>!progress.records[id])||
      area.levelIds[area.levelIds.length-1];
    let currentNodeElement=null;
    for(let sectionIndex=0;sectionIndex<sections.length;sectionIndex++){
      const section=sections[sectionIndex];
      const images=art.forSection(area.id,section.id);
      const sectionElement=document.createElement('section');
      sectionElement.className='th-v2-map-section th-v2-area-section';
      sectionElement.dataset.sectionId=section.id;
      sectionElement.setAttribute('aria-label',area.title+' map section '+(sectionIndex+1));
      art.applyLayer(sectionElement,'--th-base-art',images?.base);
      art.applyLayer(sectionElement,'--th-detail-art',images?.details);
      const base=document.createElement('div');
      base.className='th-v2-art-base';base.setAttribute('aria-hidden','true');
      const detail=document.createElement('div');
      detail.className='th-v2-art-details';detail.setAttribute('aria-hidden','true');
      sectionElement.append(base);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.classList.add('th-v2-route-svg');
      svg.setAttribute('viewBox','0 0 1000 1300');
      svg.setAttribute('preserveAspectRatio','none');
      svg.setAttribute('aria-hidden','true');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      const up=area.map.travelDirection==='up';
      path.setAttribute('d',up
        ?layout.pathForUp(section.nodes,sectionIndex<sections.length-1,sectionIndex>0)
        :layout.pathFor(section.nodes,sectionIndex>0,sectionIndex<sections.length-1));
      path.setAttribute('fill','none');
      path.setAttribute('stroke','#fff1ac');
      path.setAttribute('stroke-width','16');
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-dasharray','2 28');
      svg.append(path);
      sectionElement.append(svg,detail);
      for(const node of section.nodes){
        const id=node.levelId;
        const score=progress.records[id]?.bestMoves??null;
        const available=model.canPlay(progress,catalog,id,finsFor);
        const button=document.createElement('button');
        button.type='button';
        button.className='th-v2-node';
        button.classList.add(score!==null?'is-complete':available?'is-next':'is-locked');
        button.style.left=(node.x*100)+'%';
        button.style.top=(node.y*100)+'%';
        button.disabled=!available;
        const number=document.createElement('strong');
        number.textContent=String(node.index+1);
        const medal=document.createElement('small');
        medal.textContent=score===null?(available?'PLAY':'LOCKED'):finsFor(id,score)+' fins';
        button.append(number,medal);
        button.setAttribute('aria-label','Level '+(node.index+1)+', '+
          (score===null?(available?'ready to play':'locked'):'best '+score+' moves'));
        button.addEventListener('click',()=>openLevel(levels.findIndex(item=>item.id===id)));
        sectionElement.append(button);
        if(id===currentId){
          currentNodeElement=button;
          const haiko=document.createElement('div');
          haiko.className='th-v2-map-haiko';
          haiko.setAttribute('role','img');
          haiko.setAttribute('aria-label','Haiko the Shark at your current position');
          haiko.style.left=(node.x*100)+'%';
          haiko.style.top='calc('+(node.y*100)+'% - 60px)';
          // Haiko is independent from every map background and can be replaced
          // in the artwork registry without touching puzzle or campaign code.
          art.applyLayer(haiko,'--th-haiko-art',art.forArea(area.id)?.haiko);
          sectionElement.append(haiko);
        }
      }
      areaCanvas.append(sectionElement);
    }
    currentAreaNode=currentNodeElement;
    if(currentAreaNode&&typeof currentAreaNode.scrollIntoView==='function'){
      requestAnimationFrame(()=>currentAreaNode.scrollIntoView({block:'center',behavior:'auto'}));
    }
  }
  function showWorld(){
    if(!ready||busy)return;
    if(!catalog.tutorial.levelIds.every(id=>progress.records[id]))return showSection('tutorial');
    hideError();showSection('world');
  }
  function openArea(areaId){
    if(!ready||busy)return;
    const access=model.areaAccess(progress,catalog,areaId,finsFor);
    if(!access.available)return;
    currentArea=areaId;hideError();showSection('area');
  }
  function showFallbackMap(){
    if(!ready||busy)return;
    const current=boardIndex>=0?levels[boardIndex]:null;
    const stage=current&&worlds.getStage(catalog,current.id);
    if(stage?.areaId==='tutorial'&&!catalog.tutorial.levelIds.every(id=>progress.records[id]))
      return showSection('tutorial');
    if(stage?.areaId&&stage.areaId!=='tutorial')return openArea(stage.areaId);
    return showWorld();
  }
  function openLevel(index){
    if(!canEnter(index))return;
    hideError();
    boardIndex=index;
    const level=levels[index],stage=worlds.getStage(catalog,level.id);
    const hint=catalog.tutorial.levelIds.includes(level.id)
      ?worlds.TUTORIAL_LESSONS[index].hint
      :'Collect every treasure and reach X. Explore '+catalog.areas.find(a=>a.id===stage.areaId).title+'!';
    $('thV2LevelGuide').textContent=hint;
    // A future sprite-only renderer can switch on this explicit mode.
    document.body.dataset.thVisualMode=stage.visualMode;
    map.hidden=true;panel.hidden=false;mapButton.hidden=false;
    ui.selectLevel(index);
    ui.fitBoard();
    requestAnimationFrame(()=>ui.fitBoard());
  }
  function requestMap(){
    if(!ready||busy||!leaveDialog.hidden)return;
    if(ui.hasUnfinishedProgress()){
      leaveDialog.hidden=false;shell.inert=true;leaveStay.focus();return;
    }
    if(ui.leaveLevel()===false)return;
    showFallbackMap();
  }
  function dismissLeave(){
    leaveDialog.hidden=true;shell.inert=false;mapButton.focus();
  }
  async function boot(){
    ready=false;shell.inert=true;
    map.hidden=false;panel.hidden=true;mapButton.hidden=true;
    try{
      let state=await save.load(storage,catalog);
      if(state.needsInitialSave){
        // First-ever visitor: initialize the shared validated save once.
        await storage.save(schema.createEmptySave());
        state=await save.load(storage,catalog);
        if(state.needsInitialSave)throw Error('Could not verify new save');
      }
      progress=state.progress;
      ready=true;hideError();
      if(catalog.tutorial.levelIds.every(id=>progress.records[id]))showWorld();
      else showSection('tutorial');
    }catch(error){
      showError('Treasure Hunt could not load safely',error,boot);
    }
  }
  async function handleCompletion(detail,showVictory){
    if(!ready||busy||!detail||typeof showVictory!=='function')return;
    const index=detail.levelIndex,level=levels[index];
    if(!level||detail.level!==level||!canEnter(index))return;
    const check=engine.validateRun(level,detail.run);
    if(!check.valid||!detail.run.completed)return;
    const rating=grading.rateRun(level,detail.run);
    const previous=progress.records[level.id]?.bestMoves??null;
    const improved=previous===null||rating.score<previous;
    const commit=async()=>{
      busy=true;shell.inert=true;errorRetry.disabled=true;
      try{
        let result={progress,firstClear:false,improved:false,previousBest:previous};
        if(improved)result=await save.commitBest(storage,catalog,level.id,
          rating.score,rating.optimalMoves,finsFor);
        progress=result.progress;
        ready=true;busy=false;shell.inert=false;hideError();
        showVictory({firstClear:result.firstClear,improved:result.improved,
          previousBest:previous,bestMoves:progress.records[level.id].bestMoves});
      }catch(error){
        busy=false;
        showError('Treasure Hunt progress could not be saved',error,commit);
      }
    };
    await commit();
  }
  function advance(completedIndex,targetIndex){
    if(completedIndex===catalog.tutorial.levelIds.length-1){
      showWorld();
    }else{
      openLevel(targetIndex);
    }
  }
  $('thV2TutorialStart').addEventListener('click',()=>{
    if(!ready||busy)return;
    const index=catalog.tutorial.levelIds.findIndex(id=>!progress.records[id]);
    if(index<0)showWorld();else openLevel(index);
  });
  $('thV2WorldBack').addEventListener('click',()=>{
    currentWorldPin?.scrollIntoView?.({block:'center',behavior:'smooth'});
  });
  $('thV2AreaWorld').addEventListener('click',()=>showWorld());
  $('thV2AreaHere').addEventListener('click',()=>{
    currentAreaNode?.scrollIntoView?.({block:'center',behavior:'smooth'});
  });
  mapButton.addEventListener('click',requestMap);
  leaveStay.addEventListener('click',dismissLeave);
  leaveConfirm.addEventListener('click',()=>{
    dismissLeave();if(ui.leaveLevel()!==false)showFallbackMap();
  });
  leaveDialog.addEventListener('keydown',event=>{
    if(leaveDialog.hidden)return;
    if(event.key==='Escape'){event.preventDefault();dismissLeave();}
    if(event.key==='Tab'){
      if(event.shiftKey&&document.activeElement===leaveStay){
        event.preventDefault();leaveConfirm.focus();
      }else if(!event.shiftKey&&document.activeElement===leaveConfirm){
        event.preventDefault();leaveStay.focus();
      }
    }
  });
  winMap.hidden=false;
  winMap.addEventListener('click',()=>{
    $('thVictory').hidden=true;shell.inert=false;showFallbackMap();
  });
  root.PathleTreasureCampaign=Object.freeze({canEnter,openLevel,openArea,
    handleCompletion,advance,showWorld,requestMap,isReady:()=>ready,getView:()=>view});
  void boot();
})(window);
