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
  const worldReturn=$('thV2WorldBack');
  const areaReturn=$('thV2AreaHere');
  const areaView=$('thV2Area');
  const areaTitle=$('thV2AreaTitle');
  const areaSummary=$('thV2AreaSummary');
  const areaCanvas=$('thV2AreaCanvas');
  const mapButton=$('thMapReturn');
  const headerBack=document.querySelector('.th-back');
  const leaveDialog=$('thLeaveDialog'),leaveStay=$('thLeaveStay'),leaveConfirm=$('thLeaveConfirm');
  const errorBox=$('thCampaignError'),errorTitle=$('thCampaignErrorTitle');
  const errorText=$('thCampaignErrorText'),errorRetry=$('thCampaignRetry');
  const winMap=$('thWinMap');
  let progress=null,ready=false,busy=false,currentArea='coral-coast',boardIndex=-1,view='tutorial';
  /* Same-document history entries make the Android back gesture and the
     header arrow follow the in-game hierarchy instead of skipping home. */
  const navKey='pathleTreasureNav';
  const navHistory=root.history&&typeof root.history.pushState==='function'&&
    typeof root.history.replaceState==='function'?root.history:null;
  let navDepth=0,navInitialized=false,restoringNavigation=false,approvedBoardExit=false;
  function routeInfo(kind){
    return {view:kind,area:currentArea,index:boardIndex,depth:navDepth};
  }
  function rememberRoute(kind){
    if(!navHistory||restoringNavigation)return;
    const old=navHistory.state||{};
    const existing=old[navKey];
    if(!navInitialized){
      navInitialized=true;
      navDepth=0;
      navHistory.replaceState({...old,[navKey]:routeInfo(kind)},'');
      return;
    }
    if(existing&&existing.view===kind&&
      (kind!=='area'||existing.area===currentArea)&&
      (kind!=='level'||existing.index===boardIndex))return;
    navDepth++;
    navHistory.pushState({...old,[navKey]:routeInfo(kind)},'');
  }
  function exitToHome(){
    if(root.location&&typeof root.location.assign==='function'){
      // Always request fresh home HTML when returning from Treasure Hunt.
      // Without a unique URL, Android Chrome can reuse the previous build
      // of index.html (and its old version.js reference) from cache.
      // The link's version is the fallback if JavaScript is unavailable.
      const home=headerBack?.getAttribute?.('href')||'index.html';
      const separator=home.includes('?')?'&':'?';
      root.location.assign(home+separator+'fresh='+Date.now());
    }
  }
  function restoreCurrentHistory(){
    if(!navHistory)return;
    navHistory.pushState({...navHistory.state,[navKey]:routeInfo(view)},'');
  }
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
  /* Haiko is drawn ABOVE its destination. Centering just the destination
     with scrollIntoView() put Haiko underneath the fixed area headings.
     Treat the SHARK + current pin as a single focus group, with a safe area
     bounded by the floating controls on both maps. */
  const HAIKO_SAFE_GAP=18;
  const HAIKO_BOTTOM_GUARD=74; // phone navigation and Return to Haiko
  function visibleRect(node){
    if(typeof node?.getBoundingClientRect!=='function')return null;
    const r=node.getBoundingClientRect();
    return r&&[r.top,r.bottom,r.left,r.right].every(Number.isFinite)?r:null;
  }
  function haikoSafeBounds(kind){
    const viewport=visibleRect(map);
    if(!viewport)return null;
    const fixedHeader=visibleRect(document.querySelector('.th-header'));
    const areaHeading=kind==='area'
      ?visibleRect(document.querySelector('#thV2Area .th-v2-map-heading')):null;
    // Use actual fixed-element bounds, with phone-safe fallback sizes.
    // Do not hardcode a scroll offset solely from viewport height.
    const fallbackTop=viewport.top+(kind==='area'?168:84);
    const occupiedBottom=Math.max(fallbackTop,fixedHeader?.bottom||0,
      areaHeading?.bottom||0);
    const top=Math.max(viewport.top,occupiedBottom+HAIKO_SAFE_GAP);
    const bottom=viewport.bottom-HAIKO_BOTTOM_GUARD;
    return {top,bottom,left:viewport.left,right:viewport.right};
  }
  function focusHaiko(kind,pin,marker,behavior='auto'){
    if(!pin||!marker)return;
    const fallback=()=>pin.scrollIntoView?.({block:'center',behavior});
    const safe=haikoSafeBounds(kind);
    const shark=visibleRect(marker),button=visibleRect(pin);
    if(!safe||!shark||!button||typeof map.scrollTo!=='function'||
       !Number.isFinite(map.scrollTop)||!Number.isFinite(map.scrollHeight)||
       !Number.isFinite(map.clientHeight)){
      fallback();
      return;
    }
    const groupTop=Math.min(shark.top,button.top);
    // The shark has a small yellow pointer below its DOM box.
    const groupBottom=Math.max(shark.bottom+15,button.bottom);
    const preferredCenter=(safe.top+safe.bottom)/2;
    const currentCenter=(groupTop+groupBottom)/2;
    const delta=currentCenter-preferredCenter;
    const maximum=Math.max(0,map.scrollHeight-map.clientHeight);
    const target=Math.max(0,Math.min(maximum,map.scrollTop+delta));
    map.scrollTo({top:Math.round(target),behavior});
  }
  /* Return to Haiko is controlled by the free viewing area. The character
     itself NEVER changes visibility in response to scrolling: it remains at
     the saved map coordinate and naturally passes behind fixed controls. */
  let haikoObserver=null,haikoFallback=null,haikoWatchId=0;
  function stopHaikoWatch(){
    haikoWatchId++;
    if(haikoObserver){haikoObserver.disconnect();haikoObserver=null;}
    if(haikoFallback){
      map.removeEventListener?.('scroll',haikoFallback);
      root.removeEventListener?.('resize',haikoFallback);
      haikoFallback=null;
    }
    worldReturn.hidden=true;
    areaReturn.hidden=true;
  }
  function watchHaiko(kind,marker,pin){
    if(!marker||view!==kind)return;
    const watchId=haikoWatchId;
    const button=kind==='world'?worldReturn:areaReturn;
    let intersecting=true;
    const update=()=>{
      if(haikoWatchId!==watchId||view!==kind)return;
      const safe=haikoSafeBounds(kind);
      const shark=visibleRect(marker),currentPin=visibleRect(pin);
      const measured=Boolean(safe&&shark&&currentPin&&safe.bottom>safe.top+30);
      const clear=measured
        ?intersecting&&shark.top>=safe.top&&shark.bottom+15<=safe.bottom&&
         currentPin.bottom<=safe.bottom&&currentPin.top>=safe.top&&
         shark.right>safe.left&&shark.left<safe.right
        :intersecting;
      button.hidden=clear;
      // When exploring far from Haiko, collapse decorative fixed titles.
      // This keeps level numbers and Coming soon labels unobstructed.
      if(kind==='area'){
        if(clear)areaView.classList.remove('is-exploring');
        else areaView.classList.add('is-exploring');
      }
    };
    haikoFallback=update;
    map.addEventListener?.('scroll',update,{passive:true});
    root.addEventListener?.('resize',update);
    if(typeof root.IntersectionObserver==='function'){
      haikoObserver=new root.IntersectionObserver(entries=>{
        for(const entry of entries){
          if(entry.target===marker){
            intersecting=entry.isIntersecting;
            update();
          }
        }
      },{root:map,threshold:0});
      haikoObserver.observe(marker);
    }
    update();
  }
  function dismissVictory(){
    const result=$('thVictory');
    if(result.hidden)return;
    if(root.PathleTreasureVictory&&typeof root.PathleTreasureVictory.dismiss==='function')
      root.PathleTreasureVictory.dismiss();
    else{result.hidden=true;shell.inert=false;}
  }
  function showSection(which){
    dismissVictory();
    stopHaikoWatch();
    areaView.classList.remove('is-exploring');
    view=which;
    if(headerBack)headerBack.setAttribute('aria-label',
      (which==='world'||which==='area')?'Go to main menu':'Go back one screen');
    map.hidden=false;panel.hidden=true;mapButton.hidden=true;
    tutorialView.hidden=which!=='tutorial';
    worldView.hidden=which!=='world';
    areaView.hidden=which!=='area';
    if(which==='world')renderWorld();
    if(which==='area')renderArea();
    if(which==='tutorial')renderTutorial();
    rememberRoute(which);
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
  let currentWorldMarker=null;
  let currentAreaNode=null;
  let currentAreaMarker=null;
  // Haiko is a single artwork layer, reused on every Treasure Hunt map.
  // Progress remains under the area name; Haiko is the map position cursor.
  function makeHaikoMarker(areaId,description){
    const marker=document.createElement('div');
    marker.className='th-v2-map-haiko';
    marker.setAttribute('role','img');
    marker.setAttribute('aria-label',description);
    const sprite=art.forArea(areaId)?.haiko;
    art.applyLayer(marker,'--th-haiko-art',sprite);
    // Render the actual image as well as the CSS fallback for mobile browsers.
    if(sprite){
      const picture=document.createElement('img');
      picture.className='th-v2-haiko-sprite';
      picture.src=art.HAIKO_SPRITE_DATA||sprite+'?v=1.5.25';
      picture.width=219;
      picture.height=300;
      picture.alt='';
      picture.setAttribute('aria-hidden','true');
      marker.append(picture);
    }
    return marker;
  }
  // Put the geographic artwork into real <img> elements; the CSS
  // background remains a fallback and the buttons stay independent.
  function mountMapArtwork(container,url){
    const source=art.imageSource(url);
    if(!source)return;
    const image=document.createElement('img');
    image.className='th-v2-map-art-img';
    image.decoding='async';
    image.loading='lazy';
    image.src=source;
    image.alt='';
    image.draggable=false;
    image.setAttribute('aria-hidden','true');
    container.append(image);
  }
  function renderWorld(){
    const world=worlds.getWorld(catalog,'water-world');
    worldPins.replaceChildren();
    currentWorldPin=null;
    currentWorldMarker=null;
    const areaStates=worlds.getAreas(catalog,world.id).map(area=>({
      area,access:model.areaAccess(progress,catalog,area.id,finsFor)
    }));
    // Follow the first unfinished released area, or the furthest completed
    // unlocked area when all currently available puzzles have been solved.
    const availableAreas=areaStates.filter(item=>item.access.available);
    const activeArea=availableAreas.find(item=>
      item.area.levelIds.some(id=>!progress.records[id]))||
      availableAreas[availableAreas.length-1];
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
      mountMapArtwork(picture,section.base);
      box.append(picture);
      worldPins.append(box);
      sectionNodes.set(section.id,box);
    }
    if(!sectionNodes.size)throw new Error('Water World has no map artwork sections');
    for(const {area,access} of areaStates){
      const position=art.worldAreaPosition(world.id,area.id);
      const section=position&&sectionNodes.get(position.sectionId);
      if(!section||!Number.isFinite(position.x)||!Number.isFinite(position.y)||
         position.x<0||position.x>1||position.y<0||position.y>1){
        throw new Error('Missing valid map section/location for area '+area.id);
      }
      const button=document.createElement('button');
      button.type='button';
      button.className='th-v2-world-pin';
      button.classList.add(access.available?'is-current':'is-locked');
      button.style.left=(position.x*100)+'%';
      button.style.top=(position.y*100)+'%';
      button.disabled=!access.available;
      const cleared=area.levelIds.filter(id=>Boolean(progress.records[id])).length;
      button.textContent=area.title;
      const status=document.createElement('span');
      status.className='th-v2-world-pin-progress';
      status.textContent=access.available
        ?cleared+' / '+area.levelIds.length+' CLEARED'
        :'Soon';
      button.append(status);
      if(access.available){
        const action=document.createElement('small');
        action.className='th-v2-world-pin-action';
        action.textContent='Explore';
        button.append(action);
      }
      button.setAttribute('aria-label',area.title+(access.available
        ?', '+cleared+' of '+area.levelIds.length+' levels cleared, explore area'
        :', coming in a future update'));
      button.addEventListener('click',()=>openArea(area.id));
      section.append(button);
      if(area.id===activeArea?.area.id){
        currentWorldPin=button;
        const haiko=makeHaikoMarker(area.id,
          'Haiko is in '+area.title+', '+cleared+' of '+area.levelIds.length+' levels cleared');
        haiko.classList.add('th-v2-world-haiko');
        haiko.style.left=(position.x*100)+'%';
        haiko.style.top=(position.y*100)+'%';
        section.append(haiko);
        currentWorldMarker=haiko;
      }
    }
    // Center the chosen area and follow Haiko, not just the pin, for the
    // contextual Return button as the player scrolls.
    if(currentWorldPin&&currentWorldMarker){
      const pin=currentWorldPin,marker=currentWorldMarker;
      requestAnimationFrame(()=>{
        if(view!=='world'||currentWorldMarker!==marker)return;
        focusHaiko('world',pin,marker);
        watchHaiko('world',marker,pin);
      });
    }
  }
  function renderArea(){
    const area=catalog.areas.find(item=>item.id===currentArea);
    if(!area||area.status!=='released')return;
    areaTitle.textContent=area.title;
    const cleared=area.levelIds.filter(id=>Boolean(progress.records[id])).length;
    const earned=model.earnedFins(progress,area.levelIds,finsFor);
    areaSummary.textContent=cleared+' / '+area.levelIds.length+' CLEARED · '+earned+' fins';
    areaCanvas.replaceChildren();
    currentAreaNode=null;
    currentAreaMarker=null;
    const sections=layout.getPreviewDisplaySections(area);
    const currentId=area.levelIds.find(id=>!progress.records[id])||
      area.levelIds[area.levelIds.length-1];
    let currentNodeElement=null;
    for(let sectionIndex=0;sectionIndex<sections.length;sectionIndex++){
      const section=sections[sectionIndex];
      // Future sections reuse the existing Coral Coast illustration until their
      // own geographic artwork is released; the map stops stay independent.
      const images=art.forSection(area.id,section.id)||
        art.forSection(area.id,'coral-shallows-01');
      const sectionElement=document.createElement('section');
      sectionElement.className='th-v2-map-section th-v2-area-section';
      sectionElement.dataset.sectionId=section.id;
      if(section.nodes.some(node=>node.preview))
        sectionElement.classList.add('has-coming-soon');
      sectionElement.setAttribute('aria-label',area.title+' map section '+(sectionIndex+1));
      // Real <img> elements own the illustrated map. Duplicating the same
      // image as a CSS background caused six redundant CSS resource entries.
      // The section's water gradient remains if an image is unavailable.
      const base=document.createElement('div');
      base.className='th-v2-art-base';base.setAttribute('aria-hidden','true');
      const detail=document.createElement('div');
      detail.className='th-v2-art-details';detail.setAttribute('aria-hidden','true');
      mountMapArtwork(base,images?.base);
      mountMapArtwork(detail,images?.details);
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
      // A single continuous trail connects all numbered stops.
      path.setAttribute('stroke-linejoin','round');
      svg.append(path);
      sectionElement.append(svg,detail);
      for(const node of section.nodes){
        const id=node.levelId;
        const preview=node.preview===true;
        const score=preview?null:(progress.records[id]?.bestMoves??null);
        const available=!preview&&model.canPlay(progress,catalog,id,finsFor);
        const button=document.createElement('button');
        button.type='button';
        button.className='th-v2-node';
        button.classList.add(preview?'is-coming-soon':
          score!==null?'is-complete':available?'is-next':'is-locked');
        button.style.left=(node.x*100)+'%';
        button.style.top=(node.y*100)+'%';
        button.disabled=!available;
        const number=document.createElement('strong');
        number.textContent=String(node.index+1);
        button.append(number);
        // The level number identifies the stop; a completed result is
        // represented by its actual number of dorsal fins, never by a
        // visible numeral or PLAY/LOCKED label.
        const earned=score===null?0:finsFor(id,score);
        if(earned){
          const tier=earned===3?'gold':earned===2?'silver':'blue';
          const rating=document.createElement('span');
          rating.className='th-v2-fin-rating th-v2-fin-rating--'+tier;
          rating.setAttribute('aria-hidden','true');
          for(let fin=0;fin<earned;fin++){
            const icon=document.createElement('span');
            icon.className='th-v2-fin-icon';
            rating.append(icon);
          }
          button.append(rating);
        }
        if(preview){
          const coming=document.createElement('span');
          coming.className='th-v2-coming-soon-label';
          coming.textContent='Coming soon';
          button.append(coming);
        }
        button.setAttribute('aria-label','Level '+(node.index+1)+', '+
          (preview?'coming soon':score===null?(available?'ready to play':'locked'):
           'best '+score+' moves, '+earned+' '+(earned===3?'gold':earned===2?'silver':'blue')+
           ' '+(earned===1?'fin':'fins')));
        if(!preview)
          button.addEventListener('click',()=>openLevel(levels.findIndex(item=>item.id===id)));
        sectionElement.append(button);
        if(id===currentId){
          currentNodeElement=button;
          const completed=area.levelIds.every(levelId=>Boolean(progress.records[levelId]));
          const nextNumber=node.index+1;
          const haiko=makeHaikoMarker(area.id,
            'Haiko at '+area.title+', '+(completed?'all levels cleared':
              'next level '+nextNumber+' of '+area.levelIds.length));
          haiko.classList.add('th-v2-area-haiko');
          haiko.style.left=(node.x*100)+'%';
          haiko.style.top=(node.y*100)+'%';
          sectionElement.append(haiko);
          currentAreaMarker=haiko;
        }
      }
      areaCanvas.append(sectionElement);
    }
    currentAreaNode=currentNodeElement;
    if(currentAreaNode&&currentAreaMarker){
      const node=currentAreaNode,marker=currentAreaMarker;
      requestAnimationFrame(()=>{
        if(view!=='area'||currentAreaMarker!==marker)return;
        focusHaiko('area',node,marker);
        watchHaiko('area',marker,node);
      });
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
    dismissVictory();
    hideError();
    boardIndex=index;
    const level=levels[index],stage=worlds.getStage(catalog,level.id);
    const hint=catalog.tutorial.levelIds.includes(level.id)
      ?worlds.TUTORIAL_LESSONS[index].hint
      :'Collect every treasure and reach X. Explore '+catalog.areas.find(a=>a.id===stage.areaId).title+'!';
    $('thV2LevelGuide').textContent=hint;
    // A future sprite-only renderer can switch on this explicit mode.
    document.body.dataset.thVisualMode=stage.visualMode;
    stopHaikoWatch();
    map.hidden=true;panel.hidden=false;mapButton.hidden=false;
    view='level';
    if(headerBack)headerBack.setAttribute('aria-label','Go back one screen');
    ui.selectLevel(index);
    rememberRoute('level');
    ui.fitBoard();
    requestAnimationFrame(()=>ui.fitBoard());
  }
  function returnToMap(){
    if(ui.leaveLevel()===false)return;
    dismissVictory();
    const stage=boardIndex>=0?worlds.getStage(catalog,levels[boardIndex].id):null;
    // For a board opened from an area map, Back consumes its history entry.
    // The tutorial can contain successive boards, so it returns to its guide.
    if(stage?.areaId!=='tutorial'&&navHistory&&navDepth>0){
      approvedBoardExit=true;
      navHistory.back();
    }else showFallbackMap();
  }
  function requestMap(){
    if(!ready||busy||!leaveDialog.hidden)return;
    if(ui.hasUnfinishedProgress()){
      leaveDialog.hidden=false;shell.inert=true;leaveStay.focus();return;
    }
    returnToMap();
  }
  function dismissLeave(){
    leaveDialog.hidden=true;shell.inert=false;mapButton.focus();
  }
  function goBackOneStep(){
    if(!ready||busy||!errorBox.hidden)return;
    if(!leaveDialog.hidden){dismissLeave();return;}
    if(view==='level'){requestMap();return;}
    if(view==='area'){
      if(navHistory&&navDepth>0)navHistory.back();
      else showWorld();
      return;
    }
    // Water World is Treasure Hunt's top map; its parent is the main menu.
    exitToHome();
  }
  function onBrowserBack(event){
    if(!ready||!navHistory)return;
    const target=event.state&&event.state[navKey];
    if(!target||!['tutorial','world','area','level'].includes(target.view))return;
    if(view==='world'&&target.view!=='area'&&target.view!=='world'){
      exitToHome();return;
    }
    if(busy||!errorBox.hidden){restoreCurrentHistory();return;}
    if(!leaveDialog.hidden){
      restoreCurrentHistory();dismissLeave();return;
    }
    // The result overlay must follow Android Back even when the already
    // rendered underlying view is no longer the board.
    dismissVictory();
    if(view==='level'){
      if(!approvedBoardExit&&ui.hasUnfinishedProgress()){
        restoreCurrentHistory();
        leaveDialog.hidden=false;shell.inert=true;leaveStay.focus();return;
      }
      approvedBoardExit=false;
      if(ui.leaveLevel()===false){restoreCurrentHistory();return;}
    }
    navDepth=Math.max(0,Number(target.depth)||0);
    restoringNavigation=true;
    try{
      if(target.view==='world')showWorld();
      else if(target.view==='area')openArea(target.area);
      else if(target.view==='tutorial')showSection('tutorial');
      else if(target.view==='level'){
        // Completed tutorial/previous levels should not reopen accidentally
        // when navigating out of the board; go to the containing map instead.
        const stage=boardIndex>=0?worlds.getStage(catalog,levels[boardIndex].id):null;
        if(view==='level'&&stage?.areaId!=='tutorial'){
          showFallbackMap();
          navHistory.replaceState({...navHistory.state,[navKey]:routeInfo(view)},'');
        }else openLevel(target.index);
      }
    }finally{
      restoringNavigation=false;
    }
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
    focusHaiko('world',currentWorldPin,currentWorldMarker,'smooth');
  });
  $('thV2AreaWorld').addEventListener('click',goBackOneStep);
  $('thV2AreaHere').addEventListener('click',()=>{
    focusHaiko('area',currentAreaNode,currentAreaMarker,'smooth');
  });
  mapButton.addEventListener('click',requestMap);
  leaveStay.addEventListener('click',dismissLeave);
  leaveConfirm.addEventListener('click',()=>{
    dismissLeave();returnToMap();
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
    $('thVictory').hidden=true;shell.inert=false;
    returnToMap();
  });
  if(headerBack)headerBack.addEventListener('click',event=>{
    if(!ready)return;
    event.preventDefault();
    // Both illustrated maps use a HOME icon. Only the separate "← World"
    // area control, system Back and gameplay Back follow the map hierarchy.
    if(view==='world'||view==='area'){
      if(busy||!errorBox.hidden)return;
      exitToHome();
      return;
    }
    goBackOneStep();
  });
  if(navHistory&&typeof root.addEventListener==='function')
    root.addEventListener('popstate',onBrowserBack);
  root.PathleTreasureCampaign=Object.freeze({canEnter,openLevel,openArea,
    handleCompletion,advance,showWorld,requestMap,goBackOneStep,
    isReady:()=>ready,getView:()=>view});
  void boot();
})(window);
