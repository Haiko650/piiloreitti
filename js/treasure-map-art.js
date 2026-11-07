/* TH.6A.2 – artwork-only manifest. Swap image files or paths here,
 * never in the campaign, level generator, save model or map controls.
 * All URLs are local, optional and layered above CSS gradient fallbacks.
 */
(function(root){
  'use strict';
  const BASE='images/maps/water-world/';
  // Shared upright transparent Haiko sprite for Water World and area progress maps.
  const HAIKO_IMAGE='images/haiko-map-upright.webp';
  // Self-contained image: the map works even when a separate media request is blocked.
  const HAIKO_SPRITE_DATA='data:image/webp;base64,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';
  const REGISTRY=Object.freeze({
    worlds:Object.freeze({
      'water-world':Object.freeze({
        theme:'ocean',
        // Top-to-bottom geographic sections; add new sections without
        // changing puzzle IDs, level access rules or the map renderer.
        sections:Object.freeze([
          Object.freeze({id:'northern-sea',base:BASE+'world-northern-sea.svg'}),
          Object.freeze({id:'island-passage',base:BASE+'world-island-passage.svg'}),
          Object.freeze({id:'southern-reef',base:BASE+'world-overview.svg'})
        ]),
        // Relative coordinates live in the ART manifest, not save records.
        areas:Object.freeze({
          'coral-coast':Object.freeze({sectionId:'southern-reef',x:0.32,y:0.69}),
          'tropical-islands':Object.freeze({sectionId:'island-passage',x:0.64,y:0.49}),
          'open-ocean':Object.freeze({sectionId:'northern-sea',x:0.69,y:0.34})
        })
      })
    }),
    areas:Object.freeze({
      'coral-coast':Object.freeze({
        theme:'coast',
        haiko:HAIKO_IMAGE,
        sections:Object.freeze({
          'coral-shallows-01':Object.freeze({
            base:BASE+'coral-coast/section-01-base.svg',
            details:BASE+'coral-coast/section-01-details.svg',
            alt:'Coral Coast shallows, bright reef and sea grasses'
          })
        })
      })
    })
  });
  function forWorld(id){return REGISTRY.worlds[id]||null;}
  function worldSections(id){
    return forWorld(id)?.sections||Object.freeze([]);
  }
  function worldAreaPosition(worldId,areaId){
    const value=forWorld(worldId)?.areas?.[areaId];
    if(!value)return null;
    return value;
  }
  function forArea(id){return REGISTRY.areas[id]||null;}
  function forSection(areaId,sectionId){
    return forArea(areaId)?.sections?.[sectionId]||null;
  }
  function applyLayer(node,variable,url){
    if(!node||!node.style||typeof node.style.setProperty!=='function')return;
    const allowedMap=typeof url==='string'&&url.startsWith(BASE)&&
      /^images\/maps\/[a-z0-9/._-]+\.(?:svg|webp|png)$/.test(url);
    const allowedHaiko=url===HAIKO_IMAGE;
    if((allowedMap||allowedHaiko)&&!url.includes('..')){
      node.style.setProperty(variable,'url("'+url+'")');
    }else{
      node.style.setProperty(variable,'none');
    }
  }
  const api=Object.freeze({HAIKO_SPRITE_DATA,REGISTRY,forWorld,worldSections,worldAreaPosition,forArea,forSection,applyLayer});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureMapArt=api;
})(typeof window!=='undefined'?window:null);
