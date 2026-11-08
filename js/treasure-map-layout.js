/* Pathle TH.6A.2 – presentation-only map section layout.
 * No puzzle identities, scores or stored unlocks are affected by this file.
 * Changing background art never changes the nodes or the game rules.
 */
(function(root){
  'use strict';
  const MAX_SECTION_NODES=10;
  const FINITE01=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;
  function getSections(area){
    if(!area||!Array.isArray(area.levelIds)||!area.map)
      throw new TypeError('Invalid map area');
    const size=Number.isSafeInteger(area.map.sectionTarget)&&area.map.sectionTarget>0?
      area.map.sectionTarget:MAX_SECTION_NODES;
    const result=[];
    for(let i=0;i<area.levelIds.length;i++){
      const id=area.levelIds[i];
      const declared=area.map.nodes?.[id];
      const sectionId=declared?.sectionId||area.id+'-section-'+
        String(Math.floor(i/size)+1).padStart(2,'0');
      const within=i%size;
      // Stable fallback location, even before individual art is finished.
      const node={
        levelId:id,index:i,
        x:declared?.x??(within%2===0?0.28:0.72),
        y:declared?.y??(0.09+0.82*(within+0.5)/size)
      };
      if(!FINITE01(node.x)||!FINITE01(node.y))
        throw new RangeError('Invalid node coordinates for '+id);
      let section=result[result.length-1];
      if(!section||section.id!==sectionId){
        section={id:sectionId,areaId:area.id,nodes:[]};
        result.push(section);
      }
      section.nodes.push(Object.freeze(node));
    }
    return Object.freeze(result.map(section=>Object.freeze({
      id:section.id,areaId:section.areaId,
      nodes:Object.freeze(section.nodes),
      firstIndex:section.nodes[0].index,
      lastIndex:section.nodes[section.nodes.length-1].index
    })));
  }
  // Rendering order is separate from published level IDs and map artwork.
  // Upward travel means the last *logical* section is at the TOP of the
  // DOM, while the first (level 1) remains at the BOTTOM. Local y values
  // are mirrored rather than rewriting saved/stable map coordinates.
  function getDisplaySections(area){
    const sections=getSections(area);
    const direction=area.map.travelDirection||'down';
    if(direction==='down')return sections;
    if(direction!=='up')throw new RangeError('Invalid area map travel direction');
    return Object.freeze(sections.slice().reverse().map(section=>Object.freeze({
      ...section,
      nodes:Object.freeze(section.nodes.map(node=>Object.freeze({
        ...node,y:1-node.y
      })))
    })));
  }
  // Coral Coast's 60-stop route is presentation only. Only entries in
  // area.levelIds are playable: preview IDs never enter catalog/save data.
  // Keep the original four nodes in their approved positions; spread the
  // remaining stops across five additional 1300px illustrated sections.
  function getPreviewDisplaySections(area){
    if(!area||area.id!=='coral-coast'||area.status!=='released')
      return getDisplaySections(area);
    const released=area.levelIds.length;
    const total=Math.max(released,area.targetLevelCount||released);
    const sections=[];
    const xWave=[.36,.64,.38,.61,.32,.65,.41,.59,.33,.66,.39,.60];
    for(let index=0;index<total;index++){
      const preview=index>=released;
      const levelId=preview
        ?'map-preview-coral-'+String(index+1).padStart(3,'0')
        :area.levelIds[index];
      const declared=area.map.nodes?.[levelId];
      let sectionId,x,y;
      if(index<4){
        sectionId='coral-shallows-01';
        x=declared?.x??[.36,.63,.405,.595][index];
        y=declared?.y??[.305,.42,.555,.68][index];
      }else{
        const sectionNumber=Math.floor((index-4)/12)+2;
        const local=(index-4)%12;
        const count=Math.min(12,total-(4+(sectionNumber-2)*12));
        sectionId='coral-coast-section-'+String(sectionNumber).padStart(2,'0');
        x=declared?.x??xWave[local];
        y=declared?.y??(.09+.82*(local+.5)/count);
      }
      if(!FINITE01(x)||!FINITE01(y))
        throw new RangeError('Invalid Coral Coast map coordinates for stop '+(index+1));
      let section=sections[sections.length-1];
      if(!section||section.id!==sectionId){
        section={id:sectionId,areaId:area.id,nodes:[]};
        sections.push(section);
      }
      section.nodes.push(Object.freeze({levelId,index,x,y,preview}));
    }
    const direction=area.map.travelDirection||'down';
    if(!['up','down'].includes(direction))
      throw new RangeError('Invalid area map travel direction');
    const visible=direction==='up'?sections.slice().reverse():sections;
    return Object.freeze(visible.map(section=>Object.freeze({
      id:section.id,areaId:section.areaId,
      nodes:Object.freeze(section.nodes.map(node=>direction==='up'
        ?Object.freeze({...node,y:1-node.y}):node)),
      firstIndex:section.nodes[0].index,
      lastIndex:section.nodes[section.nodes.length-1].index
    })));
  }
  function pathForUp(nodes,hasLowerSection=false,hasUpperSection=false){
    if(!Array.isArray(nodes)||!nodes.length)return '';
    // Nodes remain in game progression order: smallest level is lower.
    const coords=nodes.map(node=>({x:node.x*1000,y:node.y*1300}));
    let result=hasLowerSection?'M500 1300':'M'+coords[0].x+' '+coords[0].y;
    if(hasLowerSection){
      const first=coords[0],mid=(1300+first.y)/2;
      result+=' C500 '+mid+' '+first.x+' '+mid+' '+first.x+' '+first.y;
    }
    for(let i=1;i<coords.length;i++){
      const a=coords[i-1],b=coords[i],mid=(a.y+b.y)/2;
      result+=' C'+a.x+' '+mid+' '+b.x+' '+mid+' '+b.x+' '+b.y;
    }
    if(hasUpperSection){
      const last=coords[coords.length-1],mid=last.y/2;
      result+=' C'+last.x+' '+mid+' 500 '+mid+' 500 0';
    }
    return result;
  }
  function pathFor(nodes,connectTop=false,connectBottom=false){
    if(!Array.isArray(nodes)||!nodes.length)return '';
    const coords=nodes.map(node=>({x:node.x*1000,y:node.y*1300}));
    let result='M'+(connectTop?500:coords[0].x)+' '+(connectTop?0:coords[0].y);
    if(connectTop){
      const first=coords[0];
      result+=' C500 '+Math.round(first.y/2)+' '+first.x+' '+Math.round(first.y/2)+' '+first.x+' '+first.y;
    }
    for(let i=1;i<coords.length;i++){
      const a=coords[i-1],b=coords[i],mid=(a.y+b.y)/2;
      result+=' C'+a.x+' '+mid+' '+b.x+' '+mid+' '+b.x+' '+b.y;
    }
    if(connectBottom){
      const last=coords[coords.length-1],mid=(last.y+1300)/2;
      result+=' C'+last.x+' '+mid+' 500 '+mid+' 500 1300';
    }
    return result;
  }
  const api=Object.freeze({MAX_SECTION_NODES,getSections,getDisplaySections,getPreviewDisplaySections,pathFor,pathForUp});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PathleTreasureMapLayout=api;
})(typeof window!=='undefined'?window:null);
