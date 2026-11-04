/* TH.4A developer-only preview loader.
 * ?th4a=1 temporarily swaps the 3 manual test boards for 30 generated
 * boards. No persistent records or unlocks are created by this preview.
 */
(function(root){
  'use strict';
  const params=new URLSearchParams(root.location.search);
  const campaign=params.get('th5')==='1';
  if(!campaign&&params.get('th4a')!=='1')return;
  const generator=root.PathleTreasureGenerator;
  const engine=root.PathleTreasureEngine;
  const solver=root.PathleTreasureSolver;
  if(!generator||!engine||!solver)throw new Error('TH.4A preview missing rule modules');
  const levels=generator.generateCampaign();
  // Fail visibly before loading UI; do not present an unfinishable level.
  for(const level of levels){
    const check=engine.validateLevel(level);
    if(!check.valid)throw new Error('Invalid generated '+level.id+': '+check.errors.join(', '));
    if(solver.solve(level).optimalMoves<1)throw new Error('No optimal route: '+level.id);
  }
  root.PathleTreasureLevels=levels;
  root.PathleTreasureCampaignMode=campaign;
  root.PathleTreasurePreview=!campaign;
})(window);
