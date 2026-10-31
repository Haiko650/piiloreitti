(()=>{'use strict';
const CONFIG=[{size:6,steps:10,name:'Easy'},{size:8,steps:18,name:'Medium'},{size:10,steps:26,name:'Hard'}];
const STORE='pathle_ocean_adventure_v1',SOUND='pathle_sound_v05',OLD_SOUND='piiloreitti_sound_v04';
const INTRO=['Welcome to Coral Reef','Pearl Discovery','Coral Gates','Pearl Trail','Reef Islands','Hidden Passage','Treasure Reef'];
const HINTS=['Haiko is ready to explore.','Pearls mark a route to treasure.','Coral grows along the reef.','Follow the pearl trail.','Reef islands reveal new passages.','A winding hidden passage.','A mystery treasure lies ahead.'];
const PEARLS=[[0,0,0],[1,2,3],[1,2,3],[1,2,4],[1,2,3],[1,2,4],[1,2,4]];
const BLOCK_COUNTS=[[0,0,0],[0,0,0],[4,8,13],[5,9,14],[7,14,21],[8,16,25],[9,18,28]];
const el=id=>document.getElementById(id);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const load=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const neighbors=(id,n)=>{const x=id%n,y=Math.floor(id/n),a=[];if(x>0)a.push(id-1);if(x<n-1)a.push(id+1);if(y>0)a.push(id-n);if(y<n-1)a.push(id+n);return a};
function makeRoute(seed,level){
 const {size:n,steps}=CONFIG[level],goal=n*n-1,random=rng(hash(seed)),path=[0],seen=new Set([0]);let count=0;
 function dfs(pos){if(++count>220000)return false;if(path.length===steps+1)return pos===goal;
  const choices=shuffle(neighbors(pos,n).filter(x=>!seen.has(x)),random);
  for(const next of choices){const left=steps-path.length,dist=n-1-next%n+n-1-Math.floor(next/n);if(dist>left||((left-dist)&1))continue;seen.add(next);path.push(next);if(dfs(next))return true;path.pop();seen.delete(next)}return false}
 if(dfs(0))return path;
 const fallback=[0];for(let x=1;x<n;x++)fallback.push(x);for(let y=1;y<n;y++)fallback.push(y*n+n-1);return fallback;
}
function makeBoard(day,level,seed){
 const n=CONFIG[level].size,random=rng(hash('pathle-board-v1|'+seed+'|'+day+'|'+level)),path=makeRoute('pathle-route-v1|'+seed+'|'+day+'|'+level,level);
 const pearlCount=PEARLS[day-1][level],inside=path.slice(1,-1),pearls=[];
 // Spread visible clues along the actual path; no need to guess whether a pearl is a trap.
 for(let j=0;j<pearlCount;j++){
  const middle=Math.max(0,Math.min(inside.length-1,Math.floor((j+1)*inside.length/(pearlCount+1))));
  let offset=Math.floor(random()*3)-1,at=Math.max(0,Math.min(inside.length-1,middle+offset));
  while(pearls.includes(inside[at])&&at<inside.length-1)at++;
  while(pearls.includes(inside[at])&&at>0)at--;
  if(!pearls.includes(inside[at]))pearls.push(inside[at]);
 }
 pearls.sort((a,b)=>path.indexOf(a)-path.indexOf(b));
 // Place clusters of obstacles, never on the true route or on a pearl.
 const pathSet=new Set(path),available=Array.from({length:n*n},(_,i)=>i).filter(i=>!pathSet.has(i));
 const amount=Math.min(available.length,BLOCK_COUNTS[day-1][level]);
 const blocked=new Set();let guard=0;
 while(blocked.size<amount&&guard++<1000){
  let candidate;
  if(blocked.size&&random()<(day>=5?.75:.42)){
   const bases=Array.from(blocked);const base=bases[Math.floor(random()*bases.length)];
   const opts=neighbors(base,n).filter(i=>!pathSet.has(i)&&!blocked.has(i));
   candidate=opts.length?opts[Math.floor(random()*opts.length)]:undefined;
  }
  if(candidate===undefined)candidate=available[Math.floor(random()*available.length)];
  if(candidate!==undefined)blocked.add(candidate);
 }
 return {path,pearls,blocks:Array.from(blocked).sort((a,b)=>a-b)};
}
const blank=()=>({visited:[0],wrongByStep:{},clicks:0,completed:false,attemptsUsed:0,bestClicks:null,attemptScores:[]});
const blankRun=(day,date,seed)=>({date,day,activeLevel:0,levels:CONFIG.map(blank),boards:CONFIG.map((_,i)=>makeBoard(day,i,seed))});
const freshAdventure=()=>({version:1,completedDays:0,lastCompleteDate:'',history:[],active:null});
function validBoard(b,i){const n=CONFIG[i].size;return b&&Array.isArray(b.path)&&b.path.length>=2&&b.path[0]===0&&b.path.at(-1)===n*n-1&&new Set(b.path).size===b.path.length&&b.path.every((v,j)=>Number.isInteger(v)&&v>=0&&v<n*n&&(j===0||neighbors(v,n).includes(b.path[j-1])))&&Array.isArray(b.pearls)&&b.pearls.every(v=>b.path.includes(v)&&v!==0&&v!==n*n-1)&&Array.isArray(b.blocks)&&b.blocks.every(v=>Number.isInteger(v)&&v>=0&&v<n*n&&!b.path.includes(v))}
function validRun(r){return r&&typeof r.date==='string'&&Number.isInteger(r.day)&&r.day>=1&&r.day<=7&&Number.isInteger(r.activeLevel)&&r.activeLevel>=0&&r.activeLevel<3&&Array.isArray(r.boards)&&r.boards.length===3&&r.boards.every(validBoard)&&Array.isArray(r.levels)&&r.levels.length===3&&r.levels.every((s,i)=>s&&Number.isInteger(s.attemptsUsed)&&s.attemptsUsed>=0&&s.attemptsUsed<=3&&Array.isArray(s.attemptScores)&&s.attemptScores.length===s.attemptsUsed&&s.attemptScores.every(v=>Number.isSafeInteger(v)&&v>=r.boards[i].path.length-1)&&Array.isArray(s.visited)&&s.visited.length>0&&s.visited.every((v,j)=>v===r.boards[i].path[j])&&s.clicks>=0&&s.wrongByStep&&typeof s.wrongByStep==='object'&&typeof s.completed==='boolean'&&(s.bestClicks===null||s.bestClicks===Math.min(...s.attemptScores)))}
let adventure=load(STORE);
if(!adventure||adventure.version!==1||!Number.isInteger(adventure.completedDays)||adventure.completedDays<0||adventure.completedDays>7||typeof adventure.lastCompleteDate!=='string'||!Array.isArray(adventure.history)||adventure.active&&!validRun(adventure.active))adventure=freshAdventure();
function persist(){if(mode==='daily')save(STORE,adventure)}
function canPlayToday(){return adventure.completedDays<7&&adventure.lastCompleteDate!==today()}
function ensureRun(){if(!canPlayToday())return null;const date=today(),day=adventure.completedDays+1;
 if(!adventure.active||adventure.active.date!==date||adventure.active.day!==day)adventure.active=blankRun(day,date,`official|${date}|${day}`);
 save(STORE,adventure);return adventure.active;
}
let sound=load(SOUND);if(typeof sound!=='boolean'){sound=load(OLD_SOUND);if(typeof sound!=='boolean')sound=true}
let mode='daily',game=null,screen='home',devEnabled=false,devDay=1,devGame=null;
const GUIDE_STORE='pathle_haiko_guides_v12',REWARD_SEEN='pathle_gold_glasses_seen_v11',EQUIP_STORE='pathle_haiko_equipment_v12',CHEST_STORE='pathle_chapter1_chest_v12',MUSIC_KEY='pathle_music_v12',AMBIENT_KEY='pathle_ambient_v12';
let equipment=load(EQUIP_STORE)||{glasses:load(REWARD_SEEN)?'gold':'purple'};
// Per-season reward inventory. The original Haiko has fully replaced image variants for glasses,
// while head/hand items and furniture get independent visual layers. Future seasons reset only cosmetics.
const COSMETIC_SEASONS={ocean:{chapterCount:52, name:'Ocean Adventure'},space:{chapterCount:52,name:'Space Adventure'}};
const COSMETIC_CATALOG={gold_glasses:{season:'ocean',slot:'glasses',appearance:'gold'},captains_chair:{season:'ocean',slot:'sceneItem',appearance:'chair'}};
const SEASON_STORE='pathle_cosmetic_season_v121';
const COSMETIC_INVENTORY='pathle_cosmetic_inventory_v121';
let activeSeason=load(SEASON_STORE)||'ocean';
let ownedCosmetics=load(COSMETIC_INVENTORY)||[];
if(equipment.glasses==='gold'&&!ownedCosmetics.includes('gold_glasses')){ownedCosmetics.push('gold_glasses');save(COSMETIC_INVENTORY,ownedCosmetics)}
// Call this ONLY when a later complete adventure season is released, never on chapter change.
function beginCosmeticSeason(id){if(!COSMETIC_SEASONS[id]||id===activeSeason)return;activeSeason=id;save(SEASON_STORE,id);ownedCosmetics=[];save(COSMETIC_INVENTORY,ownedCosmetics);equipment={glasses:'purple',sceneItem:null,hat:null,handItem:null};save(EQUIP_STORE,equipment);equipGold()}
function equipCosmetic(itemId){const c=COSMETIC_CATALOG[itemId];if(!c||c.season!==activeSeason||!ownedCosmetics.includes(itemId))return false;equipment={...equipment,[c.slot]:c.appearance};save(EQUIP_STORE,equipment);equipGold();return true}
let chestState=load(CHEST_STORE)||{opened:!!load(REWARD_SEEN)};let musicOn=load(MUSIC_KEY);if(typeof musicOn!=='boolean')musicOn=true;let ambientOn=load(AMBIENT_KEY);if(typeof ambientOn!=='boolean')ambientOn=true;
// Pathle 1.3 collectible model. Chapter content is data, not hardcoded in the puzzle engine.
const COLLECTION_STORE='pathle_season_collections_v13';
const CHAPTER_CONTENT={
 ocean:[{id:'coral-reef',number:1,title:'Coral Reef',days:7,rewardId:'luminous_pearl',world:'ocean',theme:'coral-reef'}],
 space:[]
};
const COLLECTIBLE_DEFS={luminous_pearl:{id:'luminous_pearl',title:'Luminous Pearl',season:'ocean',chapter:1,placement:'shell-pedestal'}};
let collection=load(COLLECTION_STORE);
if(!collection||collection.version!==1||!collection.seasons||typeof collection.seasons!=='object')collection={version:1,seasons:{ocean:[],space:[]}};
if(!Array.isArray(collection.seasons.ocean))collection.seasons.ocean=[];
if(!Array.isArray(collection.seasons.space))collection.seasons.space=[];
function hasTreasure(id){const item=COLLECTIBLE_DEFS[id];return !!item&&Array.isArray(collection.seasons[item.season])&&collection.seasons[item.season].includes(id)}
function grantTreasure(id){const item=COLLECTIBLE_DEFS[id];if(!item)return false;let owned=collection.seasons[item.season]||(collection.seasons[item.season]=[]);if(!owned.includes(id)){owned.push(id);save(COLLECTION_STORE,collection)}return true}
// Players who opened the original Day 7 chest keep their earned chapter reward.
if(adventure.completedDays>=7&&chestState.opened&&!hasTreasure('luminous_pearl'))grantTreasure('luminous_pearl');
// Old gold glasses are retired, never shown on Haiko or leaked as a mystery reward.

const guideFlags=load(GUIDE_STORE)||{};
let storyPages=[],storyIndex=0,storyDone=null,resizePending=false;
const guideIntro=[
 {heading:'Hey, explorer!',text:'I’m Haiko! This beautiful reef is full of secret paths and treasure. Ready to explore with me?',target:'start'},
 {heading:'Follow my fin!',text:'See my fin? That’s our start! Tap neighboring tiles to reach the golden X. Green means go; red means try another route!',target:'goal'},
 {heading:'Three chances!',text:'We get three tries per level. Remember our route, beat your best score, and let’s find a new treasure every day!',target:'start'}
];
const guidePearl=[{heading:'Ooh! A shiny pearl!',text:'I want to collect that pearl! Every pearl is on our hidden path. Let’s find a way to swim right through it!',target:'pearl'}];
const guideCoral=[{heading:'Watch out, coral!',text:'That reef is getting thicker! We can’t swim through coral. Let’s navigate around it to reach our treasure!',target:'coral'}];

let practiceNonce=0;
const makePracticeBoard=(i,old)=>{
 let b;for(let j=0;j<24;j++){
  let salt;if(window.crypto?.getRandomValues){const arr=new Uint32Array(2);crypto.getRandomValues(arr);salt=Array.from(arr).join('-')}else salt=`${Date.now()}-${Math.random()}`;
  const d=2+Math.floor(Math.random()*6);b=makeBoard(d,i,`practice-${++practiceNonce}-${salt}`);
  if(!old||b.path.join()!=old.path.join())break;
 }return b;
};
const newPractice=()=>({activeLevel:0,levels:CONFIG.map(blank),boards:CONFIG.map((_,i)=>makePracticeBoard(i))});
const allDone=()=>game&&game.levels.every(s=>mode==='practice'?s.completed:s.bestClicks!==null);
const bestTotal=()=>game.levels.reduce((s,l)=>s+(mode==='practice'?l.clicks:(l.bestClicks||0)),0);
const optimalTotal=()=>game.boards.reduce((s,b)=>s+b.path.length-1,0);
const grade=(t,opt)=>{if(t<=opt)return'S';const r=(t-opt)/opt;return r<=.25?'A':r<=.5?'B':r<=1?'C':'D'};
const finSVG='<svg class="fin-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M10 78Q30 67 39 68Q41 35 78 13Q64 44 79 67Q84 74 91 78Z" fill="#128bd7" stroke="#d6f8ff" stroke-width="5" stroke-linejoin="round"/><path d="M37 62Q45 30 72 23" stroke="#67dcff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M11 85Q26 78 41 85T73 85T93 85" stroke="#f5ffff" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';
const treasureSVG='<svg class="treasure-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M22 19Q46 49 78 81M78 20Q48 53 23 82" stroke="#693722" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M22 19Q46 49 78 81M78 20Q48 53 23 82" stroke="#ffd76b" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M21 18Q49 49 80 80M78 20Q48 53 22 83" stroke="#fff1c3" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M11 11l8 4M83 89l8-5" stroke="#f7c459" stroke-width="3" stroke-linecap="round"/></svg>';
const pearlSVG='<svg class="pearl-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M15 60Q19 89 50 90Q84 88 85 59L72 49L50 58L26 49Z" fill="#9b62ef" stroke="#e5c1ff" stroke-width="5"/><circle cx="50" cy="45" r="27" fill="#f8fcff" stroke="#91eaff" stroke-width="6"/><circle cx="41" cy="35" r="9" fill="#fff" opacity=".9"/><circle cx="60" cy="56" r="5" fill="#a7edff"/></svg>';
const coralSVG='<svg class="coral-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M48 86V27M48 58L26 40V20M48 49L71 30V14M48 74L74 65V45M48 75L28 71V57" fill="none" stroke="#f36d8f" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 90H86" stroke="#677cab" stroke-width="10" stroke-linecap="round"/></svg>';
// Haiko's base artwork and glasses are independent, reusable SVG layers.
let audio=null,musicClock=null,bubbleClock=null,waterSrc=null,waterGain=null;
let menuNoteIndex=0;
function ensureAudio(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});return audio}catch{return null}}
function tone(freq,at,len,volume=.025,kind='sine'){
 const ctx=ensureAudio();if(!ctx||!ctx.createOscillator)return;
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=kind;o.frequency.setValueAtTime(freq,at);
 g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(volume,at+.025);g.gain.exponentialRampToValueAtTime(.0001,at+len);
 o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(at+len+.025);
}
function beep(ok){if(!sound)return;const a=ensureAudio();if(!a)return;const t=a.currentTime+.015;tone(ok?680:210,t,.16,.051,ok?'sine':'triangle')}
function levelChime(){if(!sound)return;const a=ensureAudio();if(!a)return;let t=a.currentTime+.035;[659.26,783.99,1046.5].forEach((f,i)=>tone(f,t+i*.17,i===2?.48:.22,.040,'triangle'))}
function heroFanfare(){if(!sound)return;const a=ensureAudio();if(!a)return;const t=a.currentTime+.05;
 // Original five-second Shark Hero victory cue: bright arpeggio, triumphant bass and sparkling finish.
 const phrases=[[392,0,.24],[493.88,.22,.24],[587.33,.44,.28],[783.99,.72,.43],[698.46,1.14,.21],[783.99,1.37,.22],[987.77,1.63,.25],[1174.66,1.92,.52],[1046.5,2.50,.23],[1174.66,2.76,.24],[1318.51,3.02,.27],[1567.98,3.32,.52],[1760,3.91,.85]];
 for(const [f,x,d] of phrases){tone(f,t+x,d,.045,'triangle');if(x>=1.92)tone(f/2,t+x,d*.9,.021,'sine')}
 for(const [f,x] of [[196,0],[261.63,.72],[293.66,1.92],[392,3.32]])tone(f,t+x,.55,.024,'sine');
 [3.85,4.12,4.39,4.66].forEach((x,i)=>tone(1760*Math.pow(2,i/7),t+x,.32,.009,'sine'));
}
function stopWater(){if(waterSrc){try{waterSrc.stop()}catch{}waterSrc.disconnect();waterSrc=null}if(waterGain){waterGain.disconnect();waterGain=null}}
function startWater(){if(waterSrc||!ambientOn||screen!=='game'||document.hidden)return;const ctx=ensureAudio();if(!ctx)return;
 try{const secs=2,len=Math.round(ctx.sampleRate*secs),buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;data[i]=last*4}
 const src=ctx.createBufferSource(),low=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=buffer;src.loop=true;low.type='lowpass';low.frequency.value=310;gain.gain.value=.012;src.connect(low);low.connect(gain);gain.connect(ctx.destination);src.start();waterSrc=src;waterGain=gain;}catch{stopWater()}}
function bubbleSound(){if(!ambientOn||screen!=='game'||document.hidden||!audio)return;let a=audio,t=a.currentTime+.015;if(Math.random()<.65){tone(300+Math.random()*160,t,.12,.005,'sine')}}
function menuMelody(){if(!musicOn||screen!=='home'||document.hidden||!audio)return;const a=audio;const seq=[392,493.88,587.33,493.88,349.23,392,523.25,0,293.66,349.23,440,392,329.63,293.66,261.63,0];const f=seq[menuNoteIndex++%seq.length];if(f)tone(f,a.currentTime+.025,.43,.012,'sine')}
function updateAudioScene(){if(musicClock){clearInterval(musicClock);musicClock=null}if(bubbleClock){clearInterval(bubbleClock);bubbleClock=null}stopWater();if(!audio||document.hidden)return;
 if(screen==='home'&&musicOn){menuNoteIndex=0;menuMelody();musicClock=setInterval(menuMelody,510)}
 if(screen==='game'&&ambientOn){startWater();bubbleClock=setInterval(bubbleSound,2300)}
}
function activateAudio(){ensureAudio();updateAudioScene()}
let flash=null,flashTimer,celebrationTimer,resultTimer,rushToken=0;
function clearRush(){rushToken++;document.querySelectorAll('.rush-fin').forEach(x=>x.remove());document.querySelectorAll('.rush-lit,.fin-departed').forEach(x=>x.classList.remove('rush-lit','fin-departed'))}
function cancelEffects(){clearRush();clearTimeout(resultTimer);clearTimeout(flashTimer);clearTimeout(celebrationTimer);el('celebration').replaceChildren();el('resultModal').hidden=true;el('rewardModal').hidden=true;flash=null}
function rush(path,finalVictory,data){
 clearRush();clearTimeout(flashTimer);flash=null;const token=rushToken,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,board=el('board');
 if(reduce){afterRush(finalVictory,data);return}
 const tiles=Array.from(board.children),origin=tiles[0];origin?.classList.add('fin-departed');
 const fin=document.createElement('div');fin.className='rush-fin';fin.innerHTML=finSVG;document.body.append(fin);
 const duration=Math.max(900,Math.min(1900,path.length*65)),start=performance.now();let last=-1;
 function frame(now){if(token!==rushToken){fin.remove();return}const p=Math.min(1,(now-start)/duration),at=p*(path.length-1),idx=Math.min(path.length-2,Math.floor(at)),f=at-idx;
  const a=tiles[path[idx]]?.getBoundingClientRect(),b=tiles[path[idx+1]]?.getBoundingClientRect();if(!a||!b){fin.remove();afterRush(finalVictory,data);return}
  fin.style.left=(a.left+a.width/2)*(1-f)+(b.left+b.width/2)*f+'px';fin.style.top=(a.top+a.height/2)*(1-f)+(b.top+b.height/2)*f+'px';
  if(idx!==last){for(let j=Math.max(0,idx-2);j<=idx;j++)tiles[path[j]]?.classList.add('rush-lit');if(idx>3)tiles[path[idx-3]]?.classList.remove('rush-lit');last=idx}
  if(p<1)requestAnimationFrame(frame);else{fin.remove();origin?.classList.remove('fin-departed');tiles.forEach(t=>t.classList.remove('rush-lit'));if(token===rushToken)afterRush(finalVictory,data)}
 }requestAnimationFrame(frame);
}
function celebrate(isFinal){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const layer=el('celebration');layer.replaceChildren();const colors=['#ffd166','#45d6a0','#ff6685','#b477ff','#65d9ff','#ffffff'];for(let j=0;j<(isFinal?100:45);j++){const piece=document.createElement('i');piece.className='confetti';piece.style.setProperty('--x',Math.random()*100+'%');piece.style.setProperty('--w',(5+Math.random()*7)+'px');piece.style.setProperty('--h',(8+Math.random()*11)+'px');piece.style.setProperty('--c',colors[j%colors.length]);piece.style.setProperty('--d',(1.8+Math.random()*1.5)+'s');piece.style.setProperty('--delay',Math.random()*.5+'s');piece.style.setProperty('--drift',(Math.random()*180-90)+'px');piece.style.setProperty('--spin',(Math.random()*1100-550)+'deg');layer.append(piece)}
 const banner=document.createElement('div');banner.className='victory-banner';banner.textContent=isFinal?'DAILY VICTORY! ✨':'LEVEL COMPLETE! ★';layer.append(banner);
 if(isFinal){const face=document.createElement('div');face.className='victory-mascot';face.append(el('welcomeScreen').querySelector('.home-haiko').cloneNode(true));layer.append(face)}clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>layer.replaceChildren(),4100)}
function afterRush(finalVictory,data){celebrate(finalVictory);if(finalVictory)heroFanfare();else levelChime();clearTimeout(resultTimer);const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?40:(finalVictory?4550:2500);resultTimer=setTimeout(()=>{if(screen==='game'&&mode===data.mode&&game.activeLevel===data.level&&game.levels[data.level].completed){el('celebration').replaceChildren();showResult(data)}},delay)}
function showResult(data){const isDaily=mode==='daily'||mode==='dev';el('resultTitle').textContent=data.finalVictory?'Daily Victory!':'Level Complete!';el('resultSubtitle').textContent=`${CONFIG[data.level].name} · ${mode==='practice'?'Practice run':`Attempt ${data.used} of 3`}`;el('resultTaps').textContent=data.taps;el('resultBest').textContent=data.best;el('recordTag').hidden=!isDaily||!data.record;el('resultAttemptsLabel').textContent=isDaily?'YOUR THREE CHANCES':'PRACTICE MODE';const fins=el('resultFins');fins.replaceChildren();for(let j=0;j<(isDaily?3:1);j++){const x=document.createElement('span');x.className='fin'+(j<(isDaily?data.used:1)?' used':'');fins.append(x)}
 el('resultRemaining').textContent=isDaily?(data.remaining===0?'All 3 chances used · Best score saved!':`${data.remaining} ${data.remaining===1?'attempt':'attempts'} remaining`):'Unlimited practice · A new route every run';
 el('resultRetry').hidden=isDaily&&data.remaining===0;el('resultRetry').textContent=mode==='practice'?'↻ New random route':'↻ Try again';
 const next=el('resultNext');next.hidden=data.level===2&&!(mode==='dev'&&devDay<7);next.textContent=data.level===2?'Next test day →':`Next: ${CONFIG[data.level+1].name} →`;
 el('resultWarning').hidden=!isDaily||data.level===2||data.remaining===0;el('resultWarning').textContent=`Continuing gives up ${data.remaining} remaining ${data.remaining===1?'attempt':'attempts'} on this level.`;
 el('resultHome').textContent=data.reward?'🎁 Open treasure & menu':'⌂ Main menu';el('resultShare').hidden=mode!=='daily'||!data.finalVictory;
 el('resultModal').hidden=false;
 if(data.reward){el('resultNext').hidden=true;el('rewardNote').hidden=false}else el('rewardNote').hidden=true;
}
function equipGold(){document.body.classList.remove('gold-unlocked');document.body.dataset.sceneItem='none';document.body.dataset.chapter='coral-reef';}
let chestTimer=null,rewardPreview=false;
function showReward(){rewardPreview=mode==='dev';clearTimeout(chestTimer);
 const m=el('rewardModal'),chest=el('openChest'),reveal=el('chestReveal');m.hidden=false;
 chest.hidden=false;chest.classList.remove('opening');reveal.hidden=true;el('rewardClose').hidden=true;
 el('rewardTitle').textContent='A mysterious chest!';el('rewardDescription').textContent=rewardPreview?'DEV preview — rewards will not be saved.':'Haiko found a treasure. What could be inside?';
}
function unlockChest(){const chest=el('openChest');if(el('rewardModal').hidden||chest.hidden||chest.classList.contains('opening'))return;
 chest.classList.add('opening');if(sound){const a=ensureAudio();if(a){let t=a.currentTime+.03;[261.63,329.63,440,659.25].forEach((f,i)=>tone(f,t+i*.16,.44,.035,'triangle'))}}
 chestTimer=setTimeout(()=>{if(el('rewardModal').hidden)return;chest.hidden=true;el('chestReveal').hidden=false;el('rewardTitle').textContent='Treasure discovered!';el('rewardDescription').textContent=rewardPreview?'DEV preview only — no official reward is granted.':'Luminous Pearl! Your first treasure is ready for Haiko’s Hideout.';
 // Reward is committed when the treasure is opened, never by closing an animation.
 if(!rewardPreview&&adventure.completedDays>=7){chestState={opened:true};save(CHEST_STORE,chestState);grantTreasure('luminous_pearl');equipGold()}
 if(sound){const a=ensureAudio();if(a){let t=a.currentTime+.15;[783.99,1046.5,1318.51,1567.98].forEach((f,i)=>tone(f,t+i*.19,.55,.036,'sine'))}}
 el('rewardClose').hidden=false;
 },780);
}
function openStory(pages,onDone){storyPages=pages;storyIndex=0;storyDone=onDone||null;paintStory();el('storyModal').hidden=false;requestAnimationFrame(positionStoryFocus)}
function paintStory(){const a=storyPages[storyIndex];if(!a)return;el('storyHeading').textContent=a.heading;el('storyText').textContent=a.text;const dots=el('storyDots');dots.replaceChildren();storyPages.forEach((_,i)=>{const dot=document.createElement('span');dot.className=i===storyIndex?'active':'';dots.append(dot)});el('storyPrev').disabled=storyIndex===0;el('storyNext').textContent=storyIndex===storyPages.length-1?'✓':'→';requestAnimationFrame(positionStoryFocus)}
function positionStoryFocus(){
 const focus=el('guideFocus'),pointer=el('guidePointer'),scene=el('storyModal').querySelector('.haiko-guide-scene');
 if(el('storyModal').hidden||screen!=='game'||!game){focus.hidden=true;pointer.hidden=true;return}
 const target=storyPages[storyIndex]?.target,b=game.boards[game.activeLevel],tiles=el('board').children;
 let i;if(target==='start')i=0;else if(target==='goal')i=tiles.length-1;else if(target==='pearl')i=b.pearls[0];else if(target==='coral')i=b.blocks[0];
 if(i===undefined||!tiles[i]){focus.hidden=true;pointer.hidden=true;return}
 const r=tiles[i].getBoundingClientRect();if(r.width<4){focus.hidden=true;pointer.hidden=true;return}
 // Float the guide above or below the clue, never obscure the highlighted tile.
 const sh=scene.getBoundingClientRect().height||135;
 const topPos=5,bottomPos=Math.max(5,innerHeight-sh-9);
 const margin=17;
 const overlap=pos=>Math.max(0,Math.min(pos+sh+margin,r.bottom)-Math.max(pos-margin,r.top));
 const preferred=(r.top+r.bottom)/2<innerHeight*.52?bottomPos:topPos;
 let pos=preferred;
 if(overlap(pos)>0){const other=pos===topPos?bottomPos:topPos;if(overlap(other)<overlap(pos))pos=other}
 scene.style.top=Math.max(5,Math.round(pos))+'px';
 focus.hidden=false;
 focus.style.left=r.left-2+'px';focus.style.top=r.top-2+'px';focus.style.width=r.width+4+'px';focus.style.height=r.height+4+'px';
 focus.innerHTML=tiles[i].innerHTML;focus.style.background=getComputedStyle(tiles[i]).backgroundColor;
 const cast=scene.querySelector('.guideCast').getBoundingClientRect();
 const tx=r.left+r.width/2,ty=r.top+r.height/2;
 const sx=cast.left+cast.width*.75,sy=cast.top+cast.height*.66;
 pointer.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);pointer.style.width=innerWidth+'px';pointer.style.height=innerHeight+'px';
 const mx=(sx+tx)/2,my=(sy+ty)/2-(sy<ty?15:-15);
 el('guidePointerPath').setAttribute('d',`M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`);pointer.hidden=false;
}
function closeStory(){el('storyModal').hidden=true;el('guideFocus').hidden=true;el('guidePointer').hidden=true;const fn=storyDone;storyDone=null;if(fn)fn()}
function tutorialWhenNeeded(){if(mode!=='daily'&&mode!=='dev')return;
 const queue=[];
 if(mode==='daily'&&!guideFlags.intro)queue.push({pages:guideIntro,key:'intro'});
 if(game.day===2&&(mode==='dev'||!guideFlags.pearls))queue.push({pages:guidePearl,key:'pearls'});
 if(game.day===3&&(mode==='dev'||!guideFlags.coral))queue.push({pages:guideCoral,key:'coral'});
 let n=0;function next(){if(n>=queue.length)return;const item=queue[n++];openStory(item.pages,()=>{if(mode==='daily'){guideFlags[item.key]=true;save(GUIDE_STORE,guideFlags)}next()})}next();
}
function sizeBoard(){if(screen!=='game'||!game)return;
 const board=el('board'),panel=el('playPanel');if(!board||!panel)return;
 const styles=getComputedStyle(panel),padX=parseFloat(styles.paddingLeft)+parseFloat(styles.paddingRight),padY=parseFloat(styles.paddingTop)+parseFloat(styles.paddingBottom);
 let other=0;for(const child of panel.children){if(child===board)continue;const css=getComputedStyle(child);if(css.display==='none'||css.position==='absolute')continue;other+=child.offsetHeight+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0)}
 const space=Math.floor(panel.clientHeight-padY-other-12),wide=Math.floor(panel.clientWidth-padX);
 const desired=Math.max(50,Math.min(space,wide));board.style.setProperty('--board-px',desired+'px');
}
function requestSizeBoard(){if(resizePending)return;resizePending=true;requestAnimationFrame(()=>{resizePending=false;sizeBoard()})}

function renderHome(){const done=adventure.completedDays,locked=adventure.lastCompleteDate===today()||done>=7;
 el('homeChapter').textContent=`Chapter 1 · Coral Reef`;
 el('homeDay').textContent=done>=7?'7 / 7 completed':`Day ${done+1} / 7`;
 el('homeBar').style.width=(done/7*100)+'%';
 el('homeProgress').textContent=done>=7?'Chapter 1 complete! Chapter 2 coming soon.':locked?'Today’s adventure complete! See you tomorrow.':`${done} of 7 adventure days completed`;el('mysteryLine').textContent=done>=7?(chestState.opened?'✦ Treasure added to Hideout':'🎁 Treasure chest waiting to be opened'):'🎁 Mystery reward · Day 7';const dots=el('homeWeekDots');dots.replaceChildren();for(let day=1;day<=7;day++){const dot=document.createElement('span');dot.className=day<=done?'complete':day===done+1?'next':'locked';dot.setAttribute('aria-label',`Adventure day ${day}${day<=done?' completed':''}`);dot.textContent=String(day);dots.append(dot)}equipGold();
 el('playDaily').disabled=locked&&!(done>=7&&!chestState.opened);el('dailyButtonTitle').textContent=done>=7&&!chestState.opened?'Open your treasure':done>=7?'Chapter Complete':locked?'Today Complete!':'Daily Adventure';
 el('dailyButtonHint').textContent=done>=7?'Chapter 2 is in development':locked?'Come back tomorrow':'3 levels · 3 chances each · Best score wins';
 el('devPanel').hidden=!devEnabled;el('devToggle').checked=devEnabled;el('devDaySelect').value=String(devDay);
 el('goldenBadge').hidden=true;el('homeMusicState').textContent=musicOn?'Music on':'Music off';el('homeAmbientState').textContent=ambientOn?'Sea on':'Sea off';
}
function renderJourney(){const done=adventure.completedDays,days=el('journeyDays');days.replaceChildren();
 INTRO.forEach((label,i)=>{const row=document.createElement('div');row.className='journeyDay'+(i<done?' done':i===done?' next':'');const sym=document.createElement('div');sym.className='journeyDayIcon';sym.textContent=i<done?'✓':i===6?'🎁':i===done?'🦈':'🔒';const t=document.createElement('div');const strong=document.createElement('strong');strong.textContent=`Day ${i+1} · ${label}`;const small=document.createElement('small');small.textContent=i<done?'Completed':i===done?'Your next adventure':'Coming up';t.append(strong,small);row.append(sym,t);days.append(row)});
 el('journeyChapterStatus').textContent=`${done} / 7 days completed`;
 el('journeyReward').textContent=done>=7?(hasTreasure('luminous_pearl')?'✨ Chapter 1 treasure earned! Visit Haiko’s Hideout.':'🎁 A treasure chest awaits!'):'🎁 A mystery awaits at the end of Day 7';
 el('journeyNext').textContent=done>=7?'Chapter 2 · Coming soon':'Next: '+INTRO[done];
}
function renderHideout(){
 const earned=hasTreasure('luminous_pearl');
 el('hideoutPearl').hidden=!earned;el('lockedTreasure').hidden=earned;
 el('hideoutCounter').textContent=`${earned?1:0} / 1`;
 el('hideoutStoryText').textContent=earned?'Your Luminous Pearl brightens the reef. More treasures await in future chapters!':'Finish Chapter 1 to discover your first treasure!';
 el('pearlCollectionTile').classList.toggle('locked',!earned);
 el('pearlCollectionTile').classList.toggle('earned',earned);
 el('collectibleIcon').textContent=earned?'✦':'?';
 el('collectibleName').textContent=earned?'Luminous Pearl':'Mystery treasure';
 el('collectibleDetail').textContent=earned?'Chapter 1 · Coral Reef':'Complete Chapter 1 to reveal';
 el('collectibleState').textContent=earned?'Collected':'Locked';
 el('pearlCollectionTile').setAttribute('aria-label',earned?'Luminous Pearl, collected':'Mystery treasure, locked');
}
function showScreen(s){screen=s;document.body.classList.toggle('game-active',s==='game');['welcomeScreen','gameScreen','journeyScreen','hideoutScreen'].forEach(id=>el(id).hidden=(id!==({home:'welcomeScreen',game:'gameScreen',journey:'journeyScreen',hideout:'hideoutScreen'}[s])));if(s==='home')renderHome();if(s==='journey')renderJourney();if(s==='hideout')renderHideout();window.scrollTo(0,0);if(s==='game')requestSizeBoard();updateAudioScene()}
function toHome(){cancelEffects();if(mode==='daily')persist();showScreen('home')}
function startGame(which){cancelEffects();if(which==='daily'){
  if(!canPlayToday()){showScreen('home');return}
  mode='daily';game=ensureRun();
 }else if(which==='dev'){
  if(!devEnabled)return;
  mode='dev';devGame=blankRun(devDay,'DEV',`dev|${devDay}`);game=devGame;
 }else{
  mode='practice';game=newPractice();
 }
 render();showScreen('game');activateAudio();tutorialWhenNeeded();
}
function settingsOpen(){activateAudio();el('soundSwitch').checked=sound;el('musicSwitch').checked=musicOn;el('ambientSwitch').checked=ambientOn;el('settingsModal').hidden=false}
function settingsClose(){el('settingsModal').hidden=true}
function choose(id){if(!game)return;if(mode==='daily'&&today()!==game.date){alert('A new day has begun. Return to the menu to start today’s adventure.');toHome();return}
 const idx=game.activeLevel,s=game.levels[idx],b=game.boards[idx],step=s.visited.length-1,here=s.visited[step];
 if(s.completed||b.blocks.includes(id)||!neighbors(here,CONFIG[idx].size).includes(id)||s.visited.includes(id)||(s.wrongByStep[step]||[]).includes(id))return;
 s.clicks++;const right=id===b.path[step+1];
 if(right){s.visited.push(id);if(id===CONFIG[idx].size**2-1){
  s.completed=true;const oldBest=s.bestClicks;
  if(mode!=='practice'){s.attemptsUsed++;s.attemptScores.push(s.clicks);s.bestClicks=Math.min(...s.attemptScores)}
  const finale=idx===2&&allDone(),reward=finale&&game.day===7&&mode!=='practice';
  if(finale&&mode==='daily'&&adventure.lastCompleteDate!==game.date){
   adventure.completedDays++;
   adventure.lastCompleteDate=game.date;
   adventure.history.push({date:game.date,day:game.day,best:game.levels.map(x=>x.bestClicks),tries:game.levels.map(x=>x.attemptsUsed)});
   // The final board stays visible for review until the user goes home.
  }
  const data={mode,level:idx,used:mode==='practice'?1:s.attemptsUsed,remaining:mode==='practice'?null:3-s.attemptsUsed,taps:s.clicks,best:mode==='practice'?s.clicks:s.bestClicks,record:mode!=='practice'&&(oldBest===null||s.clicks<oldBest),finalVictory:finale,reward};
  const token=rushToken,path=b.path.slice();setTimeout(()=>{if(mode===data.mode&&game.activeLevel===idx&&s.completed&&token===rushToken)rush(path,finale,data)},75);
 }}else{(s.wrongByStep[step]??=[]).push(id)}
 flash={id,right};beep(right);persist();render();clearTimeout(flashTimer);flashTimer=setTimeout(()=>{flash=null;if(screen==='game')render()},290);
}
function render(){if(!game)return;const idx=game.activeLevel,cfg=CONFIG[idx],s=game.levels[idx],b=game.boards[idx],step=s.visited.length-1,here=s.visited[step],isDaily=mode!=='practice';
 el('gameTitle').textContent=mode==='daily'?'DAILY ADVENTURE':mode==='dev'?'DEV · TEST ADVENTURE':'PRACTICE MODE';
 el('dateLabel').textContent=mode==='daily'?`Day ${game.day}/7 · ${game.date}`:mode==='dev'?`Chapter 1 · Day ${devDay}/7`:'Random reef paths';
 el('practiceNote').classList.toggle('hidden',mode==='daily');el('practiceNote').textContent=mode==='dev'?'⚠ DEV TEST – This practice adventure does not change your official progress.':'PRACTICE MODE – Unlimited random paths. Your official progress is safe.';
 el('puzzleHeading').textContent=mode==='practice'?'Practice puzzles':`Day ${game.day} · ${INTRO[game.day-1]}`;
 el('levelHint').textContent='';
 const tabs=el('tabs');tabs.replaceChildren();CONFIG.forEach((conf,j)=>{const t=document.createElement('button');const completed=isDaily?game.levels[j].bestClicks!==null:game.levels[j].completed;t.type='button';t.textContent=`${j+1}. ${conf.name}${completed?' ✓':''}`;t.className=[j===idx?'active':'',completed?'finished':'',isDaily&&j!==idx?'locked':''].filter(Boolean).join(' ');t.disabled=isDaily;t.setAttribute('aria-pressed',String(j===idx));if(!isDaily)t.onclick=()=>{cancelEffects();game.activeLevel=j;game.levels[j]=blank();game.boards[j]=makePracticeBoard(j,game.boards[j]);render()};tabs.append(t)});
 const best=isDaily?s.bestClicks:(s.completed?s.clicks:null);
 el('clicks').textContent=s.clicks;el('best').textContent=best===null?'—':best;el('optimal').textContent=b.path.length-1;el('grade').textContent=best===null?'—':grade(best,b.path.length-1);
 el('attemptInfo').classList.toggle('hidden',!isDaily);
 if(isDaily)el('attemptInfo').textContent=s.completed?`Completed attempts: ${s.attemptsUsed}/3 · ${3-s.attemptsUsed} left · Best ${s.bestClicks} taps`:`Attempt ${Math.min(3,s.attemptsUsed+1)} of 3 · ${s.attemptsUsed} finished`;
 const board=el('board');board.style.setProperty('--size',cfg.size);board.replaceChildren();const adjacent=neighbors(here,cfg.size);
 for(let id=0;id<cfg.size*cfg.size;id++){
  const t=document.createElement('button');t.type='button';t.className='tile';const visited=s.visited.includes(id),wrong=(s.wrongByStep[step]||[]).includes(id),obstacle=b.blocks.includes(id),pearl=b.pearls.includes(id),possible=!s.completed&&!obstacle&&adjacent.includes(id)&&!visited&&!wrong;
  if(obstacle)t.classList.add('obstacle');if(visited)t.classList.add('visited');if(id===here)t.classList.add('current');if(wrong)t.classList.add('wrong');if(id===cfg.size*cfg.size-1)t.classList.add('goal');if(pearl)t.classList.add('pearl-tile');if(possible)t.classList.add('possible');if(flash?.id===id)t.classList.add(flash.right?'correct-pop':'wrong-pop');
  if(id===0)t.innerHTML=finSVG;else if(id===cfg.size*cfg.size-1)t.innerHTML=treasureSVG;else if(obstacle)t.innerHTML=coralSVG;else if(wrong)t.textContent='×';else if(visited)t.textContent='✓';else if(pearl)t.innerHTML=pearlSVG;
  t.disabled=!possible;t.setAttribute('aria-label',`Row ${Math.floor(id/cfg.size)+1} column ${id%cfg.size+1}${id===0?' shark fin start':''}${id===cfg.size*cfg.size-1?' treasure X finish':''}${obstacle?' obstacle':''}${pearl?' pearl clue':''}${visited?' visited':''}${wrong?' incorrect':''}`);
  t.onclick=()=>choose(id);board.append(t);
 }
 requestSizeBoard();if(!el('storyModal').hidden)requestAnimationFrame(positionStoryFocus);
 if(s.completed)el('message').textContent=`Level complete! This run: ${s.clicks} taps. ${isDaily?`Best: ${s.bestClicks}.`:''}`;
 else if(flash&&!flash.right)el('message').textContent='Not this tile. Try another adjacent tile.';
 else el('message').textContent=`Follow the route from the shark fin to the treasure X. ${step} of ${b.path.length-1} steps completed.`;
 el('next').disabled=!s.completed||idx===2;el('next').textContent=idx===2?'Final level':'Next level →';el('reset').disabled=isDaily?(!s.completed||s.attemptsUsed>=3):false;el('reset').textContent=isDaily?'Retry level':'New random route';
 el('progressHeading').textContent=mode==='daily'?'Adventure progress':mode==='dev'?'Test day progress':'Practice progress';
 el('streak').textContent=mode==='daily'?`🗺️ Day ${game.day}/7`:mode==='dev'?'🔧 DEV TEST':'🎮 Unlimited';
 el('progress').textContent=isDaily?`Best taps — ${game.levels.map((l,j)=>`${CONFIG[j].name}: ${l.bestClicks??'—'}`).join(' · ')}. ${game.levels.filter(l=>l.bestClicks!==null).length}/3 complete.`:`${game.levels.filter(l=>l.completed).length}/3 practice levels completed.`;
 const summary=el('summary');summary.classList.toggle('hidden',!allDone());if(allDone()){
  summary.replaceChildren();const h=document.createElement('h2');h.textContent=mode==='practice'?'Practice complete!':mode==='dev'?'DEV Day Complete!':'Daily Victory!';summary.append(h);
  const d=document.createElement('p');d.textContent=`Total best: ${bestTotal()} taps · Perfect: ${optimalTotal()} · Grade ${grade(bestTotal(),optimalTotal())}`;summary.append(d);
  if(mode==='daily'){const x=document.createElement('p');x.textContent=game.day===7?'🎁 Chapter 1 complete · Treasure discovered!':`🦈 Haiko advanced to Day ${game.day+1}. Come back tomorrow!`;summary.append(x)}
 }
 el('share').disabled=mode!=='daily'||!allDone();
}
function shareText(){return [`Pathle · Haiko's Ocean Adventure`,`Chapter 1 · Day ${game.day} · ${game.date}`,`Best of 3 attempts`,...game.levels.map((s,i)=>`${CONFIG[i].name}: ${s.bestClicks} taps (${s.attemptsUsed}/3 tries)`),`Total: ${bestTotal()} taps · Grade ${grade(bestTotal(),optimalTotal())}`].join('\n')}
function resetLevel(){cancelEffects();const i=game.activeLevel,s=game.levels[i];if(mode==='practice'){game.levels[i]=blank();game.boards[i]=makePracticeBoard(i,game.boards[i])}else{if(!s.completed||s.attemptsUsed>=3)return;s.visited=[0];s.wrongByStep={};s.clicks=0;s.completed=false}persist();render()}
function nextLevel(){const i=game.activeLevel,s=game.levels[i];if(i===2){if(mode==='dev'&&allDone()&&devDay<7){devDay++;el('devDaySelect').value=String(devDay);startGame('dev')}return}if(!s.completed)return;
 if(mode!=='practice'&&s.attemptsUsed<3){const left=3-s.attemptsUsed;if(!confirm(`Continue to ${CONFIG[i+1].name}? You have ${left} ${left===1?'try':'tries'} left on ${CONFIG[i].name}. You cannot return today.`))return}
 cancelEffects();game.activeLevel++;if(mode==='practice'){game.levels[game.activeLevel]=blank();game.boards[game.activeLevel]=makePracticeBoard(game.activeLevel,game.boards[game.activeLevel])}persist();render()}
el('homeSettings').onclick=settingsOpen;el('gameSettings').onclick=settingsOpen;
el('journeyQuick').onclick=()=>showScreen('journey');el('openHideout').onclick=()=>showScreen('hideout');el('hideoutBack').onclick=()=>showScreen('home');el('hideoutDone').onclick=()=>showScreen('home');el('homeGuideBtn').onclick=()=>openStory(guideIntro);el('homeMusicBtn').onclick=()=>{musicOn=!musicOn;save(MUSIC_KEY,musicOn);activateAudio();renderHome()};el('homeAmbientBtn').onclick=()=>{ambientOn=!ambientOn;save(AMBIENT_KEY,ambientOn);activateAudio();renderHome()};
el('storyPrev').onclick=()=>{if(storyIndex>0){storyIndex--;paintStory()}};
el('storyNext').onclick=()=>{if(storyIndex<storyPages.length-1){storyIndex++;paintStory()}else closeStory()};
el('storySkip').onclick=closeStory;
el('howPlaySettings').onclick=()=>{settingsClose();openStory(guideIntro)};
el('resultShare').onclick=()=>el('share').click();
window.addEventListener('resize',()=>{requestSizeBoard();positionStoryFocus()});
el('closeSettings').onclick=settingsClose;el('doneSettings').onclick=settingsClose;el('settingsModal').onclick=e=>{if(e.target===el('settingsModal'))settingsClose()};el('soundSwitch').onchange=e=>{sound=e.target.checked;save(SOUND,sound)};el('musicSwitch').onchange=e=>{musicOn=e.target.checked;save(MUSIC_KEY,musicOn);activateAudio()};el('ambientSwitch').onchange=e=>{ambientOn=e.target.checked;save(AMBIENT_KEY,ambientOn);activateAudio()};
el('devToggle').onchange=e=>{devEnabled=e.target.checked;renderHome()};el('devDaySelect').onchange=e=>{devDay=Number(e.target.value)};el('launchDev').onclick=()=>startGame('dev');
el('playDaily').onclick=()=>{if(adventure.completedDays>=7&&!chestState.opened){mode='daily';showReward()}else startGame('daily')};el('playPractice').onclick=()=>startGame('practice');el('journeyButton').onclick=()=>showScreen('journey');el('journeyBack').onclick=()=>showScreen('home');el('homeBack').onclick=toHome;
el('reset').onclick=resetLevel;el('next').onclick=nextLevel;el('resultHome').onclick=()=>{const wasReward=(mode==='dev'||mode==='daily')&&game.day===7&&allDone()&&(mode==='dev'||!chestState.opened);toHome();if(wasReward)showReward()};el('resultRetry').onclick=resetLevel;el('resultNext').onclick=nextLevel;
el('resultModal').onclick=e=>{if(e.target===el('resultModal'))el('resultModal').hidden=true};el('openChest').onclick=unlockChest;el('rewardClose').onclick=()=>{clearTimeout(chestTimer);el('rewardModal').hidden=true;equipGold();showScreen(rewardPreview?'home':'hideout')};
el('share').onclick=async()=>{if(mode!=='daily'||!allDone())return;const text=shareText();try{if(navigator.share){await navigator.share({title:'Pathle',text});return}if(navigator.clipboard){await navigator.clipboard.writeText(text);alert('Results copied!');return}}catch(e){if(e.name==='AbortError')return}prompt('Copy:',text)};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!el('storyModal').hidden)closeStory();else if(!el('settingsModal').hidden)settingsClose();else if(!el('rewardModal').hidden){if(el('openChest').hidden){el('rewardModal').hidden=true;renderHome()}}else if(!el('resultModal').hidden)el('resultModal').hidden=true}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(screen==='home')renderHome();else if(mode==='daily'&&game&&game.date!==today())toHome()}updateAudioScene()});
save(STORE,adventure);save(COLLECTION_STORE,collection);showScreen('home');
})();
