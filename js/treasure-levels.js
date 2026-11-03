/* TH.2: three deterministic handmade test boards. No persistent progress yet. */
(function(root){
  'use strict';
  const levels = Object.freeze([
    {id:'th-test-01',engineVersion:1,environment:'coast',width:6,height:8,start:42,goal:10,
      blocked:[0,6,12,18,15,16,27],treasures:[37,22],effects:[]},
    {id:'th-test-02',engineVersion:1,environment:'coast',width:8,height:12,start:14,goal:81,
      blocked:[16,24,32,40,48,56,67,68,69,35,36,43,51,59,73,74],treasures:[11,53,88],effects:[]},
    {id:'th-test-03',engineVersion:1,environment:'ocean',width:10,height:15,start:144,goal:18,
      blocked:[23,24,32,33,36,37,64,65,68,69,90,91,92,117,118,119],treasures:[11,43,77,106,129],effects:[]}
  ]);
  if (typeof module === 'object' && module.exports) module.exports = levels;
  if(root) root.PathleTreasureLevels = levels;
})(typeof window !== 'undefined' ? window : null);
