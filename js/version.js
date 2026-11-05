/* Pathle release identity for development builds.
 * Change VERSION at a tested milestone. Keep the rest of the UI in sync
 * through this module; do not hardcode conflicting versions elsewhere.
 * This is a version LABEL, not a live check for the latest Git commit.
 */
(function(root){
  'use strict';
  const VERSION='1.4.0';
  const CHANNEL='DEV';
  const info=Object.freeze({version:VERSION,channel:CHANNEL});
  root.PathleVersion=info;
  if(typeof document==='undefined')return;
  const badge=document.getElementById('homeBuildBadge');
  if(badge){
    badge.textContent=CHANNEL+' · v'+VERSION;
    badge.setAttribute('aria-label','Pathle development version '+VERSION);
  }
  const footer=document.getElementById('gameVersionFooter');
  if(footer)footer.textContent='Pathle v'+VERSION+' · Ocean Journey ('+CHANNEL+')';
  document.title='Pathle v'+VERSION+' · Ocean Journey';
})(typeof window!=='undefined'?window:null);
