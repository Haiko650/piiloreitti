(()=>{'use strict';
const CONFIG=[{size:6,steps:10,name:'Easy'},{size:8,steps:18,name:'Medium'},{size:10,steps:26,name:'Hard'}];
const PEARLS=[[0,0,0],[1,2,3],[1,2,3],[1,2,4],[1,2,3],[1,2,4],[1,2,4]];
const BLOCK_COUNTS=[[0,0,0],[0,0,0],[4,8,13],[5,9,14],[7,14,21],[8,16,25],[9,18,28]];
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
window.PathleBoardEngine = Object.freeze({CONFIG,neighbors,makeRoute,makeBoard});
})();
