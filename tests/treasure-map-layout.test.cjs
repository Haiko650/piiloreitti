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
  assert.ok(art.forArea('coral-coast').haiko.endsWith('.svg'));
  assert.ok(art.forSection('coral-coast','coral-shallows-01').base);
  const calls=[];
  const node={style:{setProperty:(k,v)=>calls.push([k,v])}};
  art.applyLayer(node,'--th-base-art','images/maps/water-world/coral-coast/custom-scene.webp');
  assert.match(calls.at(-1)[1],/custom-scene.webp/);
  art.applyLayer(node,'--th-base-art','images/maps/../../sneaky.png');
  assert.equal(calls.at(-1)[1],'none');
});

test('player-facing area renderer obtains art by section ID, not by level ID',()=>{
  const body=read('js/treasure-campaign-v2.js');
  assert.match(body,/layout\.getSections\(area\)/);
  assert.match(body,/art\.forSection\(area\.id,section\.id\)/);
  assert.match(body,/art\.forArea\(area\.id\)\?\.haiko/);
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
