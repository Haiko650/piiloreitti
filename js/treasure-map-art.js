/* TH.6A.2 – artwork-only manifest. Swap image files or paths here,
 * never in the campaign, level generator, save model or map controls.
 * All URLs are local, optional and layered above CSS gradient fallbacks.
 */
(function(root){
  'use strict';
  const BASE='images/maps/water-world/';
  // Shared upright transparent Haiko sprite for Water World and area progress maps.
  const HAIKO_IMAGE='images/haiko-map-upright.webp';
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
  const api=Object.freeze({REGISTRY,forWorld,worldSections,worldAreaPosition,forArea,forSection,applyLayer});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureMapArt=api;
})(typeof window!=='undefined'?window:null);
