/* TH.6A.2 – artwork-only manifest. Swap image files or paths here,
 * never in the campaign, level generator, save model or map controls.
 * All URLs are local, optional and layered above CSS gradient fallbacks.
 */
(function(root){
  'use strict';
  const BASE='images/maps/water-world/';
  const REGISTRY=Object.freeze({
    worlds:Object.freeze({
      'water-world':Object.freeze({
        overview:BASE+'world-overview.svg',
        theme:'ocean',
        areas:Object.freeze({
          'coral-coast':Object.freeze({x:0.25,y:0.70}),
          'tropical-islands':Object.freeze({x:0.58,y:0.42}),
          'open-ocean':Object.freeze({x:0.78,y:0.24})
        })
      })
    }),
    areas:Object.freeze({
      'coral-coast':Object.freeze({
        theme:'coast',
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
  function forArea(id){return REGISTRY.areas[id]||null;}
  function forSection(areaId,sectionId){
    return forArea(areaId)?.sections?.[sectionId]||null;
  }
  function applyLayer(node,variable,url){
    if(!node||!node.style||typeof node.style.setProperty!=='function')return;
    if(typeof url==='string'&&url.startsWith(BASE)&&
      /^images\/[a-z0-9/.\-]+\.svg$/.test(url)){
      node.style.setProperty(variable,'url("'+url+'")');
    }else{
      node.style.setProperty(variable,'none');
    }
  }
  const api=Object.freeze({REGISTRY,forWorld,forArea,forSection,applyLayer});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureMapArt=api;
})(typeof window!=='undefined'?window:null);
