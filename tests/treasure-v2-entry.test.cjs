'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=require('../js/treasure-engine.js');
const solver=require('../js/treasure-solver.js');
const grading=require('../js/treasure-grading.js');
const worlds=require('../js/treasure-worlds.js');
const release=require('../js/treasure-release-v2.js');
const model=require('../js/treasure-progress-v2.js');
const saver=require('../js/treasure-save-v2.js');
const art=require('../js/treasure-map-art.js');
const layout=require('../js/treasure-map-layout.js');
const source=fs.readFileSync(path.join(__dirname,'../js/treasure-campaign-v2.js'),'utf8');
const clone=o=>JSON.parse(JSON.stringify(o));
const idle=()=>new Promise(resolve=>setImmediate(resolve));
function element(id){
  const events={},children=[],classes=new Set(),properties={};
  const item={
    id,children,events,properties,inert:false,disabled:false,hidden:true,
    textContent:'',dataset:{},
    style:{setProperty(name,value){properties[name]=value}},
    classList:{
      add(c){classes.add(c)},remove(c){classes.delete(c)},
      contains(c){return classes.has(c)||String(item.className||'').split(/\s+/).includes(c)}
    },
    setAttribute(name,value){this[name]=value},
    append(...more){children.push(...more)},
    replaceChildren(...more){children.splice(0,children.length,...more)},
    addEventListener(name,fn){(events[name]??=[]).push(fn)},
    focus(){this.wasFocused=true},
    scrollIntoView(){this.wasScrolled=true},
    querySelector(selector){
      if(selector==='.is-next')return children.find(c=>c.classList?.contains('is-next'))||null;
      if(selector.includes('.is-complete'))return children.slice().reverse().find(c=>c.classList?.contains('is-complete'))||null;
      return null;
    },
    click(){for(const fn of events.click??[])fn({target:this,preventDefault(){}})}
  };
  return item;
}
function storage(saved){
  return {
    data:saved===null?null:clone(saved),writes:0,failWrites:0,
    async load(){return this.data===null?null:{data:clone(this.data),revision:1}},
    async save(value){this.data=clone(value);this.writes++;},
    async update(fn){
      this.writes++;
      if(this.failWrites){this.failWrites--;throw Error('Simulated IndexedDB write failure');}
      this.data=clone(fn(clone(this.data)));
    }
  };
}
const original=()=>({schemaVersion:1,extensions:{
  treasureHunt:{version:1,seed:'old-campaign',generatorVersion:1,records:{}}
},progress:{chapters:{'ocean-01':{dailyMarker:'preserve'}}},
settings:{sound:true},collection:{items:{luminous_pearl:true}}});
function harness(initial=original(),navigationOptions=null){
  const elements=new Map(),storageInstance=storage(initial),selected=[];
  const navigationListeners={};
  const $=id=>{
    if(!elements.has(id))elements.set(id,element(id));
    return elements.get(id);
  };
  const document={
    getElementById:$,createElement:tag=>element(tag),
    createElementNS:(_ns,tag)=>element(tag),
    querySelector:s=>({
      '.th-shell':$('shell'),'.th-panel':$('panel'),
      '.th-back':navigationOptions?$('headerBack'):null
    }[s]||null),
    body:{dataset:{}}
  };
  $('thLeaveDialog').hidden=true;
  $('thCampaignError').hidden=true;
  $('thVictory').hidden=true;
  const root={
    PathleTreasureCampaignV2:true,PathleTreasureReleaseV2:release,
    PathleTreasureWorlds:worlds,PathleTreasureProgressV2:model,
    PathleTreasureSaveV2:saver,PathleTreasureGrading:grading,
    PathleTreasureSolver:solver,PathleTreasureEngine:engine,
    PathleTreasureUI:{
      selectLevel:i=>selected.push(i),fitBoard(){},
      leaveLevel(){if(navigationOptions)navigationOptions.leaveCalls=(navigationOptions.leaveCalls||0)+1;return true},
      hasUnfinishedProgress:()=>Boolean(navigationOptions?.unfinished)
    },
    PathleStorage:storageInstance,PathleTreasureMapArt:art,
    PathleTreasureMapLayout:layout,
    PathleSaveSchema:{createEmptySave:()=>({
      schemaVersion:1,extensions:{},progress:{chapters:{}},
      collection:{items:{}},settings:{sound:true}
    })}
  };
  if(navigationOptions?.observeHaiko){
    const observers=[];
    navigationOptions.observers=observers;
    root.IntersectionObserver=class{
      constructor(callback,options){
        this.callback=callback;this.options=options;this.disconnected=false;
        observers.push(this);
      }
      observe(target){this.target=target;}
      disconnect(){this.disconnected=true;}
      notify(isIntersecting){
        this.callback([{target:this.target,isIntersecting}]);
      }
    };
  }
  if(navigationOptions){
    const entries=[{state:null}],pointer={index:0};
    root.location={assigned:[],assign(url){this.assigned.push(url);}};
    root.addEventListener=(name,fn)=>(navigationListeners[name]??=[]).push(fn);
    root.history={
      get state(){return entries[pointer.index].state;},
      replaceState(state){entries[pointer.index]={state:clone(state)};},
      pushState(state){
        entries.splice(pointer.index+1);
        entries.push({state:clone(state)});
        pointer.index++;
      },
      back(){
        if(pointer.index===0){root.location.assign('index.html');return;}
        pointer.index--;
        for(const fn of navigationListeners.popstate||[])
          fn({state:clone(entries[pointer.index].state)});
      }
    };
  }
  vm.runInNewContext(source,{window:root,document,requestAnimationFrame:fn=>fn()});
  return {root,storage:storageInstance,$,selected,document};
}
function completedRun(level){
  let run=engine.createRun(level);
  for(const to of solver.solve(level).path.slice(1))
    run=engine.applyAction(level,run,{type:'move',to}).state;
  assert.equal(run.completed,true);
  return run;
}
async function clear(h,index){
  const level=release.levels[index];
  h.root.PathleTreasureCampaign.openLevel(index);
  let shown;
  await h.root.PathleTreasureCampaign.handleCompletion(
    {level,run:completedRun(level),levelIndex:index},
    details=>{shown=details;});
  assert.ok(shown,'No victory after level '+index);
  return shown;
}

test('TH.6A.2 starts with tutorial rather than old thirty-map campaign',async()=>{
  const h=harness();await idle();
  assert.equal(h.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'tutorial');
  assert.equal(h.$('thV2Tutorial').hidden,false);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(0),true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(1),false);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(3),false);
  assert.equal(h.storage.writes,0);
  h.$('thV2TutorialStart').click();
  assert.deepEqual(h.selected,[0]);
});

test('three tutorial finishes unlock Water World and first Coral Coast stage',async()=>{
  const h=harness();await idle();
  for(let i=0;i<3;i++){
    const record=await clear(h,i);
    assert.equal(record.firstClear,true);
    assert.equal(record.bestMoves,solver.solve(release.levels[i]).optimalMoves);
  }
  assert.equal(h.root.PathleTreasureCampaign.canEnter(3),true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(4),false);
  h.root.PathleTreasureCampaign.advance(2,3);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'world');
  assert.equal(h.$('thV2World').hidden,false);
  const worldSections=h.$('thV2WorldPins').children;
  assert.equal(worldSections.length,3);
  assert.deepEqual(worldSections.map(section=>section.dataset.sectionId),
    ['northern-sea','island-passage','southern-reef']);
  const pins=worldSections.flatMap(section=>
    section.children.filter(item=>item.classList.contains('th-v2-world-pin')));
  assert.equal(pins.length,3);
  const coral=pins.find(pin=>pin.textContent.startsWith('Coral Coast'));
  const islands=pins.find(pin=>pin.textContent.startsWith('Tropical Islands'));
  assert.equal(coral.disabled,false);
  assert.equal(islands.disabled,true);
  assert.ok(worldSections[2].properties['--th-world-art'].includes('world-overview.svg'));
  const worldHaikos=worldSections.flatMap(section=>
    section.children.filter(item=>item.classList.contains('th-v2-world-haiko')));
  assert.equal(worldHaikos.length,1,'Only the current region gets a Haiko progress sprite');
  assert.equal(worldHaikos[0].style.left,coral.style.left);
  assert.equal(worldHaikos[0].style.top,coral.style.top);
  assert.ok(worldHaikos[0].properties['--th-haiko-art'].includes('haiko-swimming-menu.webp'));
  assert.equal(worldHaikos[0].children[0].textContent,'0 / 4 CLEARED');
  assert.match(worldHaikos[0]['aria-label'],/Coral Coast, 0 of 4 levels cleared/);
  assert.equal(coral.wasScrolled,true,'Current area should be located when entering world');
  h.$('thV2WorldBack').click();
  assert.equal(coral.wasScrolled,true,'Find my area should scroll to the current area');
  coral.click();
  assert.equal(h.root.PathleTreasureCampaign.getView(),'area');
  const area=h.$('thV2AreaCanvas');
  const sections=area.children.filter(x=>x.classList.contains('th-v2-map-section'));
  assert.equal(sections.length,1);
  assert.equal(sections[0].children.filter(x=>x.classList.contains('th-v2-node')).length,4);
  assert.ok(sections[0].properties['--th-base-art'].includes('section-01-base.svg'));
  assert.ok(sections[0].properties['--th-detail-art'].includes('section-01-details.svg'));
  assert.equal(sections[0].children.filter(x=>x.classList.contains('th-v2-map-haiko')).length,1);
  const haiko=sections[0].children.find(x=>x.classList.contains('th-v2-area-haiko'));
  assert.equal(haiko.children[0].textContent,'LEVEL 1 / 4');
  assert.ok(haiko.properties['--th-haiko-art'].includes('haiko-swimming-menu.webp'));
  const first=sections[0].children.find(x=>x.classList.contains('is-next'));
  const fourth=sections[0].children.find(x=>x.classList.contains('th-v2-node')&&
    x.children[0].textContent==='4');
  assert.ok(parseFloat(first.style.top)>parseFloat(fourth.style.top),
    'Level 1 must appear below level 4 on the vertical map');
  assert.equal(first.wasScrolled,true,'New area should open near Haiko at level 1');
  h.$('thV2AreaHere').click();
  assert.equal(first.wasScrolled,true,'Find Haiko must locate level 1');
  first.click();
  assert.equal(h.selected.at(-1),3);
  assert.deepEqual(h.storage.data.progress.chapters['ocean-01'],{dailyMarker:'preserve'});
  assert.equal(h.storage.data.extensions.treasureHunt.seed,'old-campaign');
  assert.equal(Object.keys(h.storage.data.extensions.treasureHuntV2.records).length,3);
});

test('Coral Coast current stage changes only after a successful saved victory',async()=>{
  const h=harness();await idle();
  for(let i=0;i<3;i++)await clear(h,i);
  h.root.PathleTreasureCampaign.advance(2,3);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  await clear(h,3);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  const area=h.$('thV2AreaCanvas');
  const next=area.children.flatMap(section=>section.children).find(x=>x.classList.contains('is-next'));
  assert.equal(next.children[0].textContent,'2');
  const marker=area.children.flatMap(section=>section.children)
    .find(item=>item.classList.contains('th-v2-area-haiko'));
  assert.equal(marker.children[0].textContent,'LEVEL 2 / 4');
  assert.match(marker['aria-label'],/next level 2 of 4/);
  assert.equal(marker.style.left,next.style.left);
  assert.equal(marker.style.top,next.style.top);
  h.root.PathleTreasureCampaign.showWorld();
  const worldMarker=h.$('thV2WorldPins').children.flatMap(section=>section.children)
    .find(item=>item.classList.contains('th-v2-world-haiko'));
  assert.equal(worldMarker.children[0].textContent,'1 / 4 CLEARED');
  assert.equal(h.root.PathleTreasureCampaign.canEnter(4),true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(5),false);
});

test('write failure blocks unlock; Retry Save restores controller and score',async()=>{
  const h=harness();await idle();
  h.storage.failWrites=1;
  let victories=0;
  const level=release.levels[0];
  await h.root.PathleTreasureCampaign.handleCompletion(
    {level,run:completedRun(level),levelIndex:0},()=>{victories++});
  assert.equal(victories,0);
  assert.equal(h.root.PathleTreasureCampaign.isReady(),false);
  assert.equal(h.$('thCampaignError').hidden,false);
  assert.equal(h.storage.data.extensions.treasureHuntV2,undefined);
  await h.$('thCampaignRetry').onclick();
  assert.equal(h.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(h.$('thCampaignError').hidden,true);
  assert.equal(h.root.PathleTreasureCampaign.canEnter(1),true);
  assert.equal(victories,1);
});

test('a reload preserves tutorial unlocks and does not copy old bests',async()=>{
  const h=harness();await idle();await clear(h,0);
  const h2=harness(h.storage.data);await idle();
  assert.equal(h2.root.PathleTreasureCampaign.getView(),'tutorial');
  assert.equal(h2.root.PathleTreasureCampaign.canEnter(1),true);
  assert.equal(h2.root.PathleTreasureCampaign.canEnter(3),false);
  assert.equal(h2.storage.writes,0);
});

test('after clearing all released Coral Coast stages Find Haiko locates the last one',async()=>{
  const h=harness();await idle();
  for(let i=0;i<release.levels.length;i++)await clear(h,i);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  const sections=h.$('thV2AreaCanvas').children;
  const last=sections.flatMap(section=>section.children).find(item=>
    item.classList.contains('th-v2-node')&&item.children[0].textContent==='4');
  assert.equal(last.classList.contains('is-complete'),true);
  assert.equal(last.wasScrolled,true,'Completed area should focus the furthest stage');
  h.$('thV2AreaHere').click();
  assert.equal(last.wasScrolled,true);
  assert.equal(h.storage.data.extensions.treasureHuntV2.records['th-water-coral-004'].bestMoves,
    solver.solve(release.levels[6]).optimalMoves);
});

test('new visitor without shared DB gets one safe initialized record',async()=>{
  const h=harness(null);await idle();
  assert.equal(h.root.PathleTreasureCampaign.isReady(),true);
  assert.equal(h.storage.writes,1);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'tutorial');
});

test('header arrow and Android Back return from Coral Coast to Water World, then home',async()=>{
  const nav={};
  const h=harness(original(),nav);await idle();
  for(let i=0;i<3;i++)await clear(h,i);
  h.root.PathleTreasureCampaign.advance(2,3);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'world');
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  assert.equal(h.root.PathleTreasureCampaign.getView(),'area');
  h.$('headerBack').click();
  assert.equal(h.root.PathleTreasureCampaign.getView(),'world',
    'The header arrow on Coral Coast must not leave Treasure Hunt');
  assert.deepEqual(h.root.location.assigned,[]);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  h.root.history.back(); // Android system Back / browser Back
  assert.equal(h.root.PathleTreasureCampaign.getView(),'world');
  assert.deepEqual(h.root.location.assigned,[]);
  h.$('headerBack').click();
  assert.deepEqual(h.root.location.assigned,['index.html'],
    'Water World has no parent map, so Back exits to the main menu');
});

test('native Back from an unfinished level asks before discarding moves',async()=>{
  const nav={unfinished:false};
  const h=harness(original(),nav);await idle();
  for(let i=0;i<3;i++)await clear(h,i);
  h.root.PathleTreasureCampaign.advance(2,3);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  h.root.PathleTreasureCampaign.openLevel(3);
  nav.unfinished=true;
  h.root.history.back(); // hardware gesture
  assert.equal(h.root.PathleTreasureCampaign.getView(),'level');
  assert.equal(h.$('thLeaveDialog').hidden,false);
  h.$('thLeaveStay').click();
  assert.equal(h.$('thLeaveDialog').hidden,true);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'level');
  h.$('headerBack').click();
  assert.equal(h.$('thLeaveDialog').hidden,false);
  h.$('thLeaveConfirm').click();
  assert.equal(h.$('thLeaveDialog').hidden,true);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'area');
  assert.deepEqual(h.root.location.assigned,[]);
  assert.equal(h.storage.data.progress.chapters['ocean-01'].dailyMarker,'preserve');
});

test('fresh Water World entry uses native browser Back to return home',async()=>{
  const first=harness();await idle();
  for(let i=0;i<3;i++)await clear(first,i);
  const nav={};
  const fresh=harness(first.storage.data,nav);await idle();
  assert.equal(fresh.root.PathleTreasureCampaign.getView(),'world');
  fresh.root.history.back();
  assert.deepEqual(fresh.root.location.assigned,['index.html']);
});

test('Return to Haiko appears only when the active Water World area is offscreen',async()=>{
  const seed=harness();await idle();
  for(let i=0;i<3;i++)await clear(seed,i);
  const nav={observeHaiko:true};
  const h=harness(seed.storage.data,nav);await idle();
  assert.equal(h.root.PathleTreasureCampaign.getView(),'world');
  const btn=h.$('thV2WorldBack');
  assert.equal(btn.hidden,true,'Initial auto-centered area needs no return action');
  assert.equal(nav.observers.length,1);
  const watcher=nav.observers[0];
  assert.equal(watcher.options.root,h.$('thCampaignMap'));
  assert.equal(watcher.target.classList.contains('th-v2-world-haiko'),true);
  const activePin=h.$('thV2WorldPins').children.flatMap(section=>section.children)
    .find(item=>item.classList.contains('th-v2-world-pin')&&item.classList.contains('is-current'));
  assert.ok(activePin);
  activePin.wasScrolled=false;
  watcher.notify(true);
  assert.equal(btn.hidden,true,'Return should remain hidden while current region is in view');
  watcher.notify(false);
  assert.equal(btn.hidden,false,'Return must appear once current region is offscreen');
  btn.click();
  assert.equal(activePin.wasScrolled,true,'Return still scrolls to the current region');
  watcher.notify(true);
  assert.equal(btn.hidden,true,'Return disappears after Haiko is visible again');
});

test('Coral Coast uses its Haiko sprite as viewport anchor and ignores stale watchers',async()=>{
  const seed=harness();await idle();
  for(let i=0;i<3;i++)await clear(seed,i);
  const nav={observeHaiko:true};
  const h=harness(seed.storage.data,nav);await idle();
  const old=nav.observers[0];
  old.notify(false);
  assert.equal(h.$('thV2WorldBack').hidden,false);
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  assert.equal(old.disconnected,true);
  assert.equal(h.$('thV2WorldBack').hidden,true);
  assert.equal(h.$('thV2AreaHere').hidden,true,'Initially Haiko is automatically centered');
  assert.equal(nav.observers.length,2);
  const active=nav.observers[1];
  assert.equal(active.options.root,h.$('thCampaignMap'));
  assert.equal(active.target.className,'th-v2-map-haiko th-v2-area-haiko');
  old.notify(false);
  assert.equal(h.$('thV2WorldBack').hidden,true,'Old map cannot revive hidden button');
  active.notify(true);
  assert.equal(h.$('thV2AreaHere').hidden,true);
  active.notify(false);
  assert.equal(h.$('thV2AreaHere').hidden,false);
  h.$('thV2AreaHere').click();
  const node=h.$('thV2AreaCanvas').children.flatMap(section=>section.children)
    .find(item=>item.classList.contains('is-next'));
  assert.equal(node.wasScrolled,true,'Area return still centers the current level');
  active.notify(true);
  assert.equal(h.$('thV2AreaHere').hidden,true);
  h.$('headerBack').click();
  assert.equal(active.disconnected,true);
  assert.equal(h.$('thV2AreaHere').hidden,true);
  assert.equal(h.root.PathleTreasureCampaign.getView(),'world');
});

test('a finished Coral Coast area keeps Haiko on the final unlocked level',async()=>{
  const h=harness();await idle();
  for(let i=0;i<release.levels.length;i++)await clear(h,i);
  h.root.PathleTreasureCampaign.showWorld();
  const world=h.$('thV2WorldPins').children.flatMap(section=>section.children)
    .find(item=>item.classList.contains('th-v2-world-haiko'));
  assert.ok(world);
  assert.equal(world.children[0].textContent,'4 / 4 CLEARED');
  h.root.PathleTreasureCampaign.openArea('coral-coast');
  const marker=h.$('thV2AreaCanvas').children.flatMap(section=>section.children)
    .find(item=>item.classList.contains('th-v2-area-haiko'));
  assert.ok(marker);
  assert.equal(marker.children[0].textContent,'4 / 4 CLEARED');
  assert.match(marker['aria-label'],/all levels cleared/);
});
