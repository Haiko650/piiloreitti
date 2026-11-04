/* Pathle Treasure Hunt – TH.4A deterministic static-level generator.
 * A level is a pure function of generator version, campaign seed, level index.
 * Never derive it from today's date or Math.random(): old cleared levels must
 * replay identically even after new campaign levels are added.
 *
 * Engine v1 only: no currents, gates, whirlpools or timed hazards yet.
 * Gameplay validation and exact route finding belong to existing TH.1 / TH.3A.
 */
(function(root){
  'use strict';
  const VERSION=1;
  const DEFAULT_SEED='pathle-treasure-campaign-2026-v1';
  const DEFAULT_COUNT=30;
  const MAX_INDEX=100000;
  const AREAS=Object.freeze(['coast','ocean','river','forest']);
  const PROFILES=Object.freeze([
    Object.freeze({width:6,height:8,lowDensity:.08,highDensity:.15,treasureBase:2,minGoalDistance:6}),
    Object.freeze({width:8,height:12,lowDensity:.12,highDensity:.20,treasureBase:3,minGoalDistance:10}),
    Object.freeze({width:10,height:15,lowDensity:.15,highDensity:.24,treasureBase:4,minGoalDistance:13})
  ]);
  function requireIndex(index){
    if(!Number.isSafeInteger(index)||index<1||index>MAX_INDEX){
      throw new RangeError('Treasure Hunt level index must be an integer from 1 to '+MAX_INDEX);
    }
  }
  function requireSeed(seed){
    if(typeof seed!=='string'||!seed.length||seed.length>128){
      throw new TypeError('Campaign seed must be 1..128 characters');
    }
  }
  function hash(value){
    let h=2166136261;
    for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function rng(seed){
    let state=seed>>>0;
    return function(){
      state=(state+0x6D2B79F5)>>>0;
      let t=state;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function randomInt(random,limit){return Math.floor(random()*limit);}
  function neighbors(width,height,id){
    const x=id%width,y=Math.floor(id/width),next=[];
    if(y>0)next.push(id-width);
    if(x+1<width)next.push(id+1);
    if(y+1<height)next.push(id+width);
    if(x>0)next.push(id-1);
    return next;
  }
  function distanceMap(width,height,blocked,origin){
    const count=width*height,dist=new Int16Array(count).fill(-1);
    const queue=new Int16Array(count);
    let head=0,tail=0;
    queue[tail++]=origin;dist[origin]=0;
    while(head<tail){
      const from=queue[head++];
      for(const next of neighbors(width,height,from)){
        if(blocked.has(next)||dist[next]>=0)continue;
        dist[next]=dist[from]+1;
        queue[tail++]=next;
      }
    }
    return dist;
  }
  function largestComponent(width,height,blocked){
    const count=width*height,seen=new Uint8Array(count);
    let largest=[];
    for(let tile=0;tile<count;tile++){
      if(seen[tile]||blocked.has(tile))continue;
      const group=[tile];seen[tile]=1;
      for(let head=0;head<group.length;head++){
        for(const next of neighbors(width,height,group[head])){
          if(blocked.has(next)||seen[next])continue;
          seen[next]=1;group.push(next);
        }
      }
      if(group.length>largest.length)largest=group;
    }
    return largest;
  }
  function chooseBlocked(profile,random,density){
    const width=profile.width,height=profile.height,total=width*height;
    const count=Math.round(total*density),blocked=new Set();
    const selected=[];
    let attempts=0;
    while(blocked.size<count&&attempts++<total*25){
      let tile;
      if(selected.length&&random()<.62){
        const near=neighbors(width,height,selected[randomInt(random,selected.length)]);
        tile=near[randomInt(random,near.length)];
      }else tile=randomInt(random,total);
      if(blocked.has(tile))continue;
      blocked.add(tile);selected.push(tile);
    }
    return blocked;
  }
  function chooseGoal(width,height,blocked,component,start,minimum,random){
    const distances=distanceMap(width,height,blocked,start);
    const far=component.filter(cell=>cell!==start&&distances[cell]>=minimum);
    if(!far.length)return null;
    const best=Math.max(...far.map(cell=>distances[cell]));
    const candidates=far.filter(cell=>distances[cell]>=Math.max(minimum,Math.ceil(best*.72)));
    return candidates[randomInt(random,candidates.length)];
  }
  function selectTreasures(width,height,blocked,component,start,goal,count,random){
    const result=[],anchors=[start,goal],used=new Set(anchors);
    while(result.length<count){
      const maps=anchors.map(anchor=>distanceMap(width,height,blocked,anchor));
      const candidates=component.filter(id=>!used.has(id)).map(id=>({
        id,spread:Math.min(...maps.map(m=>m[id]))
      }));
      if(!candidates.length)throw new Error('Insufficient Treasure Hunt cells');
      candidates.sort((a,b)=>b.spread-a.spread||a.id-b.id);
      const top=Math.max(1,Math.min(candidates.length,Math.ceil(candidates.length*.20)));
      const selected=candidates[randomInt(random,top)].id;
      result.push(selected);used.add(selected);anchors.push(selected);
    }
    return result.sort((a,b)=>a-b);
  }
  function getProfile(index){
    requireIndex(index);
    const band=Math.floor((index-1)/10);
    const tier=Math.min(2,band);
    const phase=(index-1)%10/9;
    return {
      ...PROFILES[tier],
      environment:AREAS[band%AREAS.length],
      density:PROFILES[tier].lowDensity+
        (PROFILES[tier].highDensity-PROFILES[tier].lowDensity)*phase,
      treasures:Math.min(5,PROFILES[tier].treasureBase+((index-1)%10>=6?1:0))
    };
  }
  function generateLevel(index,seed=DEFAULT_SEED){
    requireIndex(index);requireSeed(seed);
    const p=getProfile(index),random=rng(hash('TH4A|'+VERSION+'|'+seed+'|'+index));
    const total=p.width*p.height;
    let level=null;
    for(let attempt=0;attempt<48;attempt++){
      const blocked=chooseBlocked(p,random,p.density);
      const component=largestComponent(p.width,p.height,blocked);
      if(component.length<Math.ceil((total-blocked.size)*.77))continue;
      const start=component[randomInt(random,component.length)];
      const goal=chooseGoal(p.width,p.height,blocked,component,start,p.minGoalDistance,random);
      if(goal===null)continue;
      const treasures=selectTreasures(p.width,p.height,blocked,component,start,goal,p.treasures,random);
      level={
        id:'thg'+VERSION+'-'+hash(seed).toString(16).padStart(8,'0')+'-'+String(index).padStart(5,'0'),
        engineVersion:1, generatorVersion:VERSION,
        environment:p.environment,
        width:p.width,height:p.height,
        start,goal,blocked:[...blocked].sort((a,b)=>a-b),treasures,effects:[]
      };
      break;
    }
    if(!level)throw new Error('Unable to generate connected TH.4A level '+index);
    return level;
  }
  function generateCampaign(count=DEFAULT_COUNT,seed=DEFAULT_SEED){
    if(!Number.isSafeInteger(count)||count<1||count>MAX_INDEX)throw new RangeError('Invalid campaign length');
    requireSeed(seed);
    return Array.from({length:count},(_,i)=>generateLevel(i+1,seed));
  }
  const api=Object.freeze({
    VERSION,DEFAULT_SEED,DEFAULT_COUNT,MAX_INDEX,AREAS,
    getProfile,generateLevel,generateCampaign
  });
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureGenerator=api;
})(typeof window!=='undefined'?window:null);
