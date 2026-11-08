/* Pathle version label and read-only update check.
 * The published version.json manifest belongs to the same web origin.
 * Checks NEVER write saves, change game state, or reload automatically.
 * Keep VERSION and version.json synchronized for each player-facing release.
 */
(function(root){
  'use strict';
  const VERSION='1.5.36';
  const CHANNEL='DEV';
  const info=Object.freeze({version:VERSION,channel:CHANNEL});
  root.PathleVersion=info;
  if(typeof document==='undefined')return;

  const $=id=>document.getElementById(id);
  const badge=$('homeBuildBadge');
  const footer=$('gameVersionFooter');
  if(badge){
    badge.textContent=CHANNEL+' · v'+VERSION;
    badge.setAttribute('aria-label','Check for Pathle updates, installed development version '+VERSION);
  }
  if(footer)footer.textContent='Pathle v'+VERSION+' · Ocean Journey ('+CHANNEL+')';
  document.title='Pathle v'+VERSION+' · Ocean Journey';

  // The version script can also be loaded on a page without update controls.
  const modal=$('updateModal');
  const status=$('updateMessage');
  const installed=$('updateLoadedVersion');
  const retry=$('updateRetry');
  const install=$('updateInstall');
  const close=$('updateClose');
  if(!badge||!modal||!status||!installed||!retry||!install||!close)return;

  const VERSION_PATTERN=/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
  function parts(value){
    if(typeof value!=='string'||!VERSION_PATTERN.test(value))return null;
    const nums=value.split('.').map(Number);
    return nums.every(Number.isSafeInteger)?nums:null;
  }
  function compare(a,b){
    const left=parts(a),right=parts(b);
    if(!left||!right)throw new Error('Invalid version number');
    for(let i=0;i<3;i++){
      if(left[i]!==right[i])return left[i]>right[i]?1:-1;
    }
    return 0;
  }

  let checking=false;
  let availableVersion=null;
  installed.textContent='Installed: '+CHANNEL+' · v'+VERSION;
  function message(text){
    status.textContent=text;
  }
  function setAvailable(value){
    availableVersion=value;
    badge.classList.toggle('has-update',Boolean(value));
    if(value){
      badge.setAttribute('aria-label','Pathle version '+VERSION+', update to '+value+' available. Tap to view');
      install.textContent='Load v'+value;
      install.hidden=false;
    }else{
      badge.setAttribute('aria-label','Check for Pathle updates, installed development version '+VERSION);
      install.hidden=true;
    }
  }

  async function checkLatest(){
    if(checking)return;
    checking=true;
    retry.disabled=true;
    install.hidden=true;
    message('Checking published version…');
    try{
      if(typeof root.fetch!=='function')throw new Error('Network check unavailable');
      // A fresh query plus no-store prevents stale manifests on mobile/CDN.
      const url=new URL('version.json',document.baseURI);
      url.searchParams.set('_',String(Date.now()));
      const response=await root.fetch(url.toString(),{cache:'no-store'});
      if(!response||!response.ok)throw new Error('Version information could not be fetched');
      const remote=await response.json();
      if(!remote||remote.channel!==CHANNEL||!parts(remote.version)){
        throw new Error('Unexpected published version information');
      }
      const diff=compare(remote.version,VERSION);
      if(diff>0){
        setAvailable(remote.version);
        message('New version v'+remote.version+' is available. Load it when you are ready. Your saved progress stays on this device.');
      }else if(diff===0){
        setAvailable(null);
        message('You are using the latest published version (v'+VERSION+').');
      }else{
        setAvailable(null);
        message('The published version information is catching up. Please check again shortly.');
      }
    }catch(_error){
      setAvailable(null);
      message('Could not check for updates. Check your internet connection and try again.');
    }finally{
      checking=false;
      retry.disabled=false;
    }
  }

  function openModal(){
    const welcome=$('welcomeScreen');
    if(!welcome||welcome.hidden||document.body.classList.contains('game-active'))return;
    modal.hidden=false;
    welcome.inert=true;
    close.focus();
    // Always recheck when the player explicitly requests an update status.
    void checkLatest();
  }
  function closeModal(){
    if(modal.hidden)return;
    modal.hidden=true;
    const welcome=$('welcomeScreen');
    if(welcome)welcome.inert=false;
    badge.focus();
  }

  badge.addEventListener('click',openModal);
  retry.addEventListener('click',()=>{void checkLatest();});
  close.addEventListener('click',closeModal);
  modal.addEventListener('click',event=>{
    if(event.target===modal)closeModal();
  });
  modal.addEventListener('keydown',event=>{
    if(modal.hidden)return;
    if(event.key==='Escape'){
      event.preventDefault();
      closeModal();
    }else if(event.key==='Tab'){
      const controls=[install,retry,close].filter(button=>!button.hidden&&!button.disabled);
      if(!controls.length)return;
      if(event.shiftKey&&document.activeElement===controls[0]){
        event.preventDefault();
        controls[controls.length-1].focus();
      }else if(!event.shiftKey&&document.activeElement===controls[controls.length-1]){
        event.preventDefault();
        controls[0].focus();
      }
    }
  });
  install.addEventListener('click',()=>{
    if(!availableVersion||compare(availableVersion,VERSION)<=0)return;
    const welcome=$('welcomeScreen');
    if(!welcome||welcome.hidden||document.body.classList.contains('game-active'))return;
    // The new URL bypasses cached index.html; same origin keeps IndexedDB data.
    const url=new URL(root.location.href);
    url.searchParams.set('pathle-update',availableVersion);
    root.location.assign(url.toString());
  });

  // Silent, nonblocking check on menu load. It only marks the version badge.
  // No pop-up or automatic page refresh while the user is playing.
  if(typeof root.fetch==='function')void checkLatest();
})(typeof window!=='undefined'?window:null);
