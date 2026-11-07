'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const layout=require('../js/treasure-map-layout.js');
const art=require('../js/treasure-map-art.js');
const release=require('../js/treasure-release-v2.js');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const mutable=o=>JSON.parse(JSON.stringify(o));

test('currently published Coral Coast nodes retain original art section and positions',()=>{
  const area=release.catalog.areas[0];
  const sections=layout.getSections(area);
  assert.equal(sections.length,1);
  assert.equal(sections[0].id,'coral-shallows-01');
  assert.equal(sections[0].nodes.length,4);
  assert.deepEqual(sections[0].nodes.map(n=>[n.x,n.y]),[
    [0.22,0.11],[0.76,0.34],[0.31,0.61],[0.69,0.86]
  ]);
});

test('appending 60 levels creates independent scrolling artwork segments',()=>{
  const area=mutable(release.catalog.areas[0]);
  const oldIds=area.levelIds.slice();
  const extras=Array.from({length:60-oldIds.length},(_,i)=>
    'th-water-coral-'+String(i+oldIds.length+1).padStart(3,'0'));
  area.levelIds=[...oldIds,...extras];
  const sections=layout.getSections(area);
  assert.ok(sections.length>5);
  assert.deepEqual(sections[0].nodes.map(n=>n.levelId),oldIds);
  assert.equal(sections.flatMap(s=>s.nodes.map(n=>n.levelId)).length,60);
  assert.equal(new Set(sections.map(s=>s.id)).size,sections.length);
  for(const section of sections){
    assert.ok(section.nodes.every(n=>n.x>=0&&n.x<=1&&n.y>=0&&n.y<=1));
    assert.ok(layout.pathFor(section.nodes,true,true).startsWith('M500 0'));
    assert.ok(layout.pathFor(section.nodes,true,true).endsWith('500 1300'));
  }
});

test('art assets are independent of stable level IDs and allow replacement images',()=>{
  const segments=art.worldSections('water-world');
  assert.equal(segments.length,3);
  assert.deepEqual(segments.map(item=>item.id),[
    'northern-sea','island-passage','southern-reef'
  ]);
  assert.ok(segments.every(item=>item.base.endsWith('.svg')));
  assert.ok(segments.every(item=>fs.existsSync(path.join(__dirname,'..',item.base))));
  assert.deepEqual(art.worldAreaPosition('water-world','coral-coast'),
    art.REGISTRY.worlds['water-world'].areas['coral-coast']);
  assert.equal(art.forArea('coral-coast').haiko,'images/haiko-swimming-menu.webp');
  assert.ok(fs.existsSync(path.join(__dirname,'..',art.forArea('coral-coast').haiko)));
  assert.ok(art.forSection('coral-coast','coral-shallows-01').base);
  const calls=[];
  const node={style:{setProperty:(k,v)=>calls.push([k,v])}};
  art.applyLayer(node,'--th-base-art','images/maps/water-world/coral-coast/custom-scene.webp');
  assert.match(calls.at(-1)[1],/custom-scene.webp/);
  art.applyLayer(node,'--th-haiko-art',art.forArea('coral-coast').haiko);
  assert.match(calls.at(-1)[1],/haiko-swimming-menu.webp/);
  art.applyLayer(node,'--th-base-art','images/maps/../../sneaky.png');
  assert.equal(calls.at(-1)[1],'none');
});

test('player-facing area renderer obtains art by section ID, not by level ID',()=>{
  const body=read('js/treasure-campaign-v2.js');
  assert.match(body,/layout\.getDisplaySections\(area\)/);
  assert.match(body,/layout\.pathForUp\(section\.nodes/);
  assert.match(body,/art\.forSection\(area\.id,section\.id\)/);
  assert.match(body,/art\.forArea\(areaId\)\?\.haiko/);
  assert.doesNotMatch(body,/haiko\.style\.backgroundImage/);
  const html=read('treasure-hunt.html');
  const layoutScript=html.indexOf('js/treasure-map-layout.js');
  const uiScript=html.indexOf('js/treasure-campaign-v2.js');
  assert.ok(layoutScript>0&&layoutScript<uiScript);
  const css=read('css/treasure-world-v2.css');
  assert.match(css,/\.th-v2-map-section\{/);
  assert.match(css,/background-image:var\(--th-haiko-art,none\)/);
});

test('no changes to old level identities or old save keys',()=>{
  const body=read('js/treasure-campaign-v2.js');
  assert.ok(!body.includes('extensions.treasureHunt='));
  assert.equal(release.catalog.tutorial.levelIds.length,3);
  assert.equal(release.levels.length,7);
});

test('world area pins use stable section IDs and valid image-independent positions',()=>{
  const world=art.forWorld('water-world');
  const ids=new Set(art.worldSections('water-world').map(item=>item.id));
  assert.equal(ids.size,3);
  for(const area of release.catalog.areas){
    const loc=art.worldAreaPosition(area.worldId,area.id);
    assert.ok(loc,'Missing world marker for '+area.id);
    assert.ok(ids.has(loc.sectionId),'No artwork section for '+area.id);
    assert.ok(loc.x>0&&loc.x<1&&loc.y>0&&loc.y<1);
  }
  const src=read('js/treasure-campaign-v2.js');
  assert.match(src,/for\(const section of art\.worldSections\(world\.id\)\)/);
  assert.match(src,/art\.worldAreaPosition\(world\.id,area\.id\)/);
  assert.doesNotMatch(src,/worldCanvas\.style\.height\s*=/);
  assert.doesNotMatch(src,/art\.applyLayer\(worldCanvas/);
});

test('Coral Coast level 1 is at the bottom, with unchanged level IDs and map artwork',()=>{
  const area=release.catalog.areas[0];
  assert.equal(area.map.travelDirection,'up');
  const logical=layout.getSections(area);
  const visual=layout.getDisplaySections(area);
  assert.equal(visual.length,1);
  assert.equal(visual[0].id,logical[0].id);
  assert.deepEqual(visual[0].nodes.map(n=>n.levelId),area.levelIds);
  assert.deepEqual(visual[0].nodes.map(n=>n.x),[.22,.76,.31,.69]);
  const expectedY=[.89,.66,.39,.14];
  visual[0].nodes.forEach((node,i)=>assert.ok(Math.abs(node.y-expectedY[i])<1e-10));
  assert.ok(visual[0].nodes.every((node,i,all)=>i===0||node.y<all[i-1].y));
  assert.equal(layout.getSections(area)[0].nodes[0].y,.11,
    'Original map definition must not mutate for existing saves');
  assert.equal(layout.pathForUp(visual[0].nodes,false,false).startsWith('M220 1157'),true);
  assert.equal(art.forSection('coral-coast',visual[0].id).base,
    art.forSection('coral-coast',logical[0].id).base);
  assert.deepEqual(release.levels.slice(3).map(l=>l.id),area.levelIds);
});

test('60 or 120 levels render as bottom-to-top sections with connected upward trails',()=>{
  for(const count of [60,120]){
    const area=mutable(release.catalog.areas[0]);
    area.targetLevelCount=count;
    area.levelIds=[
      ...area.levelIds,
      ...Array.from({length:count-area.levelIds.length},(_,i)=>
        'th-water-coral-'+String(i+5).padStart(3,'0'))
    ];
    const original=layout.getSections(area);
    const display=layout.getDisplaySections(area);
    assert.equal(display.length,original.length);
    assert.equal(display[0].id,original[original.length-1].id,
      'Newest section is at the top');
    assert.equal(display.at(-1).id,original[0].id,
      'Original section remains at the bottom');
    assert.equal(display[0].nodes.at(-1).levelId,area.levelIds.at(-1));
    assert.equal(display.at(-1).nodes[0].levelId,area.levelIds[0]);
    assert.equal(display.reduce((sum,section)=>sum+section.nodes.length,0),count);
    for(let index=0;index<display.length;index++){
      const section=display[index];
      assert.ok(section.nodes.every((node,i,nodes)=>i===0||node.y<nodes[i-1].y),
        'Levels must climb upward within each section');
      const hasLower=index<display.length-1;
      const hasUpper=index>0;
      const p=layout.pathForUp(section.nodes,hasLower,hasUpper);
      if(hasLower)assert.ok(p.startsWith('M500 1300'));
      if(hasUpper)assert.ok(p.endsWith('500 0'));
      if(!hasLower)assert.ok(p.startsWith(
        'M'+(section.nodes[0].x*1000)+' '+(section.nodes[0].y*1300)));
    }
    assert.deepEqual(layout.getSections(area).map(section=>section.id),
      original.map(section=>section.id),
      'Orientation must not rewrite stable artwork section identities');
  }
});

test('downward layout remains available for worlds using a different trail style',()=>{
  const area=mutable(release.catalog.areas[0]);
  area.map.travelDirection='down';
  assert.deepEqual(layout.getDisplaySections(area),layout.getSections(area));
  area.map.travelDirection='sideways';
  assert.throws(()=>layout.getDisplaySections(area),/direction/);
});
