/* TH.6A.2 player-facing bootstrap – one canonical Treasure Hunt entry. */
(function(root){
  'use strict';
  const engine=root.PathleTreasureEngine;
  const release=root.PathleTreasureReleaseV2;
  const worlds=root.PathleTreasureWorlds;
  if(!engine||!release||!worlds)throw new Error('TH.6A.2 bootstrap modules missing');
  worlds.assertValid(release.catalog);
  for(const level of release.levels){
    const valid=engine.validateLevel(level);
    if(!valid.valid)throw new Error('Invalid released TH.6A.2 level: '+level.id+' '+valid.errors.join('; '));
  }
  root.PathleTreasureLevels=release.levels;
  root.PathleTreasureCampaignMode=true;
  root.PathleTreasureCampaignV2=true;
})(window);
