/* Treasure Hunt entrypoint: generated adventure is now the normal game.
 * There is only one player-facing Treasure Hunt experience, with a map.
 * The manual 3-map prototype remains as a Node regression fixture, not UI.
 * Stable seed/version preserve existing TH.5 records and best scores.
 */
(function(root){
  'use strict';
  const generator=root.PathleTreasureGenerator;
  const engine=root.PathleTreasureEngine;
  if(!generator||!engine)throw new Error('Treasure Hunt generator and rules must load first');
  const levels=generator.generateCampaign();
  for(const level of levels){
    const validation=engine.validateLevel(level);
    if(!validation.valid)throw new Error('Treasure Hunt map '+level.id+' is invalid: '+validation.errors.join('; '));
  }
  root.PathleTreasureLevels=levels;
  root.PathleTreasureCampaignMode=true;
})(window);
