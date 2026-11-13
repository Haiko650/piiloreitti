'use strict';
// Browser-level safety net for Pathle's actual HTML/CSS/JS on isolated localhost.
// Run separately from the dependency-free Node regression suite:
//   npm install --no-save playwright@1.56.1
//   npx playwright install chromium
//   node --test tests/browser/*.test.cjs
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const output=path.join(root,'browser-test-results');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
let server,origin,browser;

before(async()=>{
  fs.mkdirSync(output,{recursive:true});
  server=http.createServer((req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const requested=pathname==='/'?'/index.html':pathname;
      const file=path.resolve(root,'.'+requested);
      if(!file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
      const data=fs.readFileSync(file);
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(data);
    }catch(_error){res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});
});

after(async()=>{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
});

async function mobilePage(width=390,height=844){
  const context=await browser.newContext({viewport:{width,height},
    deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  const exceptions=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  return {context,page,exceptions};
}
async function screenshot(page,name){
  await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
}
async function seedTutorialCompletion(page){
  await page.evaluate(async()=>{
    const release=window.PathleTreasureReleaseV2;
    const catalog=release.catalog;
    const model=window.PathleTreasureProgressV2;
    const solver=window.PathleTreasureSolver;
    const grading=window.PathleTreasureGrading;
    let progress=model.empty();
    const finsFor=(id,moves)=>grading.rateMoves(
      moves,solver.solve(release.getById(id)).optimalMoves).fins;
    for(const id of catalog.tutorial.levelIds){
      const optimal=solver.solve(release.getById(id)).optimalMoves;
      progress=model.recordBest(progress,catalog,id,optimal,optimal,finsFor).progress;
    }
    const data=window.PathleSaveSchema.createEmptySave();
    data.extensions[model.KEY]=progress;
    await window.PathleStorage.save(data);
  });
}

test('mobile home boots, displays artwork and can enter/exit Daily Challenge',{timeout:60000},async()=>{
  const {page,context,exceptions}=await mobilePage(390,844);
  try{
    await page.goto(origin+'/index.html',{waitUntil:'load'});
    await page.locator('#welcomeScreen:not([hidden])').waitFor();
    await page.waitForFunction(()=>Boolean(window.PathleBoardEngine)&&
      !document.querySelector('#welcomeScreen').inert);
    assert.equal(await page.locator('#playDaily').isEnabled(),true);
    assert.equal(await page.locator('#playTreasure').count(),1);
    const logo=page.locator('.pathleHomeLogoImage');
    await logo.evaluate(img=>img.decode());
    assert.ok((await logo.boundingBox()).width>50,'Pathle logo is unexpectedly clipped');
    await screenshot(page,'home-mobile-390');
    await page.locator('#homeSettings').click();
    await page.locator('#settingsModal:not([hidden])').waitFor();
    for(const id of ['soundSwitch','musicSwitch','ambientSwitch']){
      assert.equal(await page.locator('#'+id).count(),1,'Missing settings toggle '+id);
    }
    await screenshot(page,'settings-mobile-390');
    await page.locator('#doneSettings').click();
    await page.locator('#settingsModal').waitFor({state:'hidden'});
    await page.locator('#openHideout').click();
    await page.locator('#hideoutScreen:not([hidden])').waitFor();
    assert.ok(await page.locator('#hideoutCounter').count()>0);
    await screenshot(page,'hideout-mobile-390');
    await page.locator('#hideoutBack').click();
    await page.locator('#welcomeScreen:not([hidden])').waitFor();
    await page.locator('#playDaily').click();
    await page.locator('#gameScreen:not([hidden])').waitFor();
    assert.ok(await page.locator('#board').locator('*').count()>0,
      'Daily Challenge board did not render');
    if(await page.locator('#storyModal').isVisible()){
      await page.locator('#storySkip').click();
    }
    await page.locator('#homeBack').click();
    await page.locator('#welcomeScreen:not([hidden])').waitFor();
    assert.deepEqual(exceptions,[],'Uncaught browser JavaScript errors');
  }finally{await context.close();}
});

test('main menu buttons stay inside narrow and tablet viewports',{timeout:60000},async()=>{
  for(const width of [360,768]){
    const {page,context,exceptions}=await mobilePage(width,850);
    try{
      await page.goto(origin+'/index.html',{waitUntil:'load'});
      await page.locator('#welcomeScreen:not([hidden])').waitFor();
      await page.waitForFunction(()=>!document.querySelector('#welcomeScreen').inert);
      // The menu logo and animated Haiko load asynchronously. Wait for
      // decoded pixels before recording a deterministic visual baseline.
      for(const selector of ['.pathleHomeLogoImage','.home-swimming-art']){
        await page.locator(selector).evaluate(async img=>{
          await img.decode();
          if(img.naturalWidth===0)throw Error('Unloaded menu image');
        });
      }
      if(width>=600){
        const fullBleed=await page.evaluate(()=>{
          const main=document.querySelector('main');
          const welcome=document.getElementById('welcomeScreen');
          return {mainWidth:main.getBoundingClientRect().width,
            welcomeWidth:welcome.getBoundingClientRect().width};
        });
        assert.ok(fullBleed.mainWidth>=width-2,
          'Tablet home is still restricted to a narrow 500px column');
        assert.ok(fullBleed.welcomeWidth>=width-2,
          'Tablet reef background does not fill the viewport');
      }
      const rects=await page.evaluate(()=>{
        const ids=['playDaily','playTreasure','openHideout'];
        return ids.map(id=>{
          const rect=document.getElementById(id).getBoundingClientRect();
          return {id,left:rect.left,right:rect.right,width:rect.width,height:rect.height};
        });
      });
      assert.ok(rects.every(rect=>rect.width>100&&rect.height>36&&
        rect.left>=-2&&rect.right<=width+2),'Menu button clipped: '+JSON.stringify(rects));
      await screenshot(page,'home-responsive-'+width);
      assert.deepEqual(exceptions,[],'Uncaught browser JavaScript errors');
    }finally{await context.close();}
  }
});

test('Treasure Hunt opens its genuine first-run tutorial',{timeout:45000},async()=>{
  const {page,context,exceptions}=await mobilePage(360,740);
  try{
    await page.goto(origin+'/index.html',{waitUntil:'load'});
    await page.locator('#playTreasure').click();
    await page.locator('#thV2Tutorial:not([hidden])').waitFor();
    assert.match(await page.locator('#thV2TutorialSummary').textContent(),/0\s*\/\s*3/);
    await page.locator('#thV2TutorialStart').click();
    await page.locator('.th-panel:not([hidden])').waitFor();
    assert.ok(await page.locator('#thBoard').locator('*').count()>0,
      'Treasure Hunt tutorial board was not rendered');
    await screenshot(page,'treasure-tutorial-360');
    assert.deepEqual(exceptions,[],'Uncaught browser JavaScript errors');
  }finally{await context.close();}
});

test('shared water tiles load their textured WebP in both real game boards',{timeout:65000},async()=>{
  const {page,context,exceptions}=await mobilePage(390,844);
  const expected=origin+'/images/skins/pathle-water-tile.webp';
  async function assertWater(boardSelector,tileSelector,shotName){
    const tile=page.locator(boardSelector+' '+tileSelector+'[data-terrain="water"]').first();
    await tile.waitFor();
    const result=await tile.evaluate(async element=>{
      const css=getComputedStyle(element).backgroundImage;
      const urls=[...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match=>match[1]);
      const url=urls.find(value=>value.includes('pathle-water-tile.webp'));
      if(!url)return {css,url:null,naturalWidth:0,naturalHeight:0};
      const image=new Image();
      image.src=url;
      try{await image.decode();}
      catch{return {css,url,naturalWidth:0,naturalHeight:0};}
      return {css,url,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight};
    });
    assert.equal(result.url,expected,
      'Water background resolves incorrectly; it should NOT load from /css/images/');
    assert.ok(result.naturalWidth>=128&&result.naturalHeight>=128,
      'Water WebP failed to decode; only the fallback flat color will show');
    await screenshot(page,shotName);
  }
  try{
    await page.goto(origin+'/index.html',{waitUntil:'load'});
    await page.waitForFunction(()=>!document.querySelector('#welcomeScreen').inert);
    await page.locator('#playDaily').click();
    await page.locator('#gameScreen:not([hidden])').waitFor();
    if(await page.locator('#storyModal').isVisible())await page.locator('#storySkip').click();
    await assertWater('#board','.tile','water-tiles-daily-390');
    await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
    await page.locator('#thV2Tutorial:not([hidden])').waitFor();
    await page.locator('#thV2TutorialStart').click();
    await page.locator('.th-panel:not([hidden])').waitFor();
    await assertWater('#thBoard','.th-tile','water-tiles-treasure-390');
    assert.deepEqual(exceptions,[],'Uncaught errors while rendering water textures');
  }finally{await context.close();}
});

test('Coral Coast renders 60 markers, disabled previews and Return to Haiko',{timeout:90000},async()=>{
  const {page,context,exceptions}=await mobilePage(390,844);
  try{
    await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
    await page.locator('#thV2Tutorial:not([hidden])').waitFor();
    // Create progress using the shipped, validated game APIs. Each browser
    // context has its own fresh IndexedDB; no real player data is touched.
    await seedTutorialCompletion(page);
    await page.reload({waitUntil:'load'});
    await page.locator('#thV2World:not([hidden])').waitFor();
    const worldPin=page.locator('.th-v2-world-pin.is-current');
    assert.equal(await worldPin.count(),1);
    await worldPin.click();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    const areaMarker=page.locator('#thV2Area .th-v2-map-haiko.th-v2-area-haiko');
    await areaMarker.waitFor();
    const markerStyle=await areaMarker.evaluate(el=>{
      const s=getComputedStyle(el);
      return {width:s.width,height:s.height,zIndex:s.zIndex,border:s.borderTopWidth,
        pointerEvents:s.pointerEvents,display:s.display};
    });
    assert.deepEqual(markerStyle,{width:'96px',height:'126px',zIndex:'24',
      border:'0px',pointerEvents:'none',display:'block'},
      'Upright Haiko must retain its approved dimensions and layer priority');
    const sections=page.locator('#thV2AreaCanvas .th-v2-area-section');
    assert.equal(await sections.count(),6);
    assert.equal(await page.locator('#thV2AreaCanvas .th-v2-node').count(),60);
    const future=page.locator('#thV2AreaCanvas .th-v2-node.is-coming-soon');
    assert.equal(await future.count(),56);
    assert.equal(await page.locator('#thV2AreaCanvas .th-v2-node.is-next').count(),1);
    const previews=await future.evaluateAll(items=>items.map(el=>({
      disabled:el.disabled,label:el.textContent.includes('Coming soon')
    })));
    assert.ok(previews.every(item=>item.disabled&&item.label),
      'Preview markers must be disabled and labeled Coming soon');
    const imageSources=await sections.locator('.th-v2-art-base img').evaluateAll(items=>
      items.map(img=>new URL(img.src).pathname));
    assert.equal(imageSources.length,6);
    assert.equal(new Set(imageSources).size,6,'Each section needs distinct artwork');
    assert.ok(imageSources.every(name=>name.endsWith('.webp')));
    await screenshot(page,'coral-coast-current-390');
    await page.setViewportSize({width:320,height:740});
    const compactStyle=await areaMarker.evaluate(el=>{
      const s=getComputedStyle(el);
      return {width:s.width,height:s.height,zIndex:s.zIndex};
    });
    assert.deepEqual(compactStyle,{width:'80px',height:'110px',zIndex:'24'},
      'Small-screen map Haiko must remain unobstructed');
    await screenshot(page,'coral-coast-compact-320');
    await page.setViewportSize({width:390,height:844});
    const map=page.locator('#thCampaignMap');
    await map.evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'));});
    // A screenshot captured immediately after jumping six sections can be
    // taken before the uppermost lazy image has finished decoding.
    const topArtwork=sections.first().locator('.th-v2-art-base img');
    await topArtwork.evaluate(img=>img.decode());
    assert.ok(await topArtwork.evaluate(img=>img.naturalWidth>=600),
      'Top Coral Coast artwork never decoded after scrolling into view');
    await page.locator('#thV2AreaHere:not([hidden])').waitFor();
    const image=page.locator('#thV2AreaHere .th-v2-return-haiko-img');
    await image.evaluate(img=>img.decode());
    assert.ok((await image.boundingBox()).width>0,'Return to Haiko portrait is missing');
    await screenshot(page,'coral-coast-top-390');
    await page.locator('#thV2AreaHere').click();
    await page.locator('#thV2AreaHere').waitFor({state:'hidden',timeout:12000});
    await page.locator('#thV2AreaWorld').click();
    await page.locator('#thV2World:not([hidden])').waitFor();
    assert.deepEqual(exceptions,[],'Uncaught browser JavaScript errors');
  }finally{await context.close();}
});


test('damaged retired cosmetics cannot block gameplay or overwrite IndexedDB',{timeout:60000},async()=>{
  const {page,context,exceptions}=await mobilePage(390,844);
  try{
    await page.goto(origin+'/index.html',{waitUntil:'load'});
    await page.waitForFunction(()=>window.PathleSaveBoot?.status==='created'&&
      !document.querySelector('#welcomeScreen').inert);
    await page.evaluate(async()=>{
      await window.PathleStorage.update(data=>{
        data.settings.sound=false;
        data.extensions.legacyProtectionProbe={marker:'keep-me'};
        return data;
      });
      localStorage.setItem('pathle_haiko_equipment_v12',JSON.stringify({glasses:'gold'}));
      localStorage.setItem('pathle_cosmetic_inventory_v121',JSON.stringify({broken:true}));
      localStorage.setItem('pathle_cosmetic_season_v121',JSON.stringify('not-a-season'));
    });
    const rawBefore=await page.evaluate(()=>Object.fromEntries([
      'pathle_haiko_equipment_v12','pathle_cosmetic_inventory_v121',
      'pathle_cosmetic_season_v121'].map(k=>[k,localStorage.getItem(k)])));
    const revisionBefore=await page.evaluate(async()=>(
      await window.PathleStorage.load()).revision);
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>window.PathleSaveBoot?.status==='loaded'&&
      !document.querySelector('#welcomeScreen').inert);
    const state=await page.evaluate(async()=>{
      const snapshot=await window.PathleStorage.load();
      return {revision:snapshot.revision,sound:snapshot.data.settings.sound,
        extension:snapshot.data.extensions.legacyProtectionProbe};
    });
    assert.equal(state.revision,revisionBefore,'Retired cosmetics rotated the live save');
    assert.equal(state.sound,false);
    assert.equal(state.extension.marker,'keep-me');
    const rawAfter=await page.evaluate(()=>Object.fromEntries([
      'pathle_haiko_equipment_v12','pathle_cosmetic_inventory_v121',
      'pathle_cosmetic_season_v121'].map(k=>[k,localStorage.getItem(k)])));
    assert.deepEqual(rawAfter,rawBefore,'Malformed retired local data was overwritten');
    await page.locator('#playDaily').click();
    await page.locator('#gameScreen:not([hidden])').waitFor();
    const saved=await page.evaluate(async()=>(
      await window.PathleStorage.load()).data);
    assert.equal(saved.settings.sound,false);
    assert.equal(saved.extensions.legacyProtectionProbe.marker,'keep-me');
    assert.deepEqual(exceptions,[],'Malformed retired cosmetic data caused browser errors');
  }finally{await context.close();}
});

test('record diagnostic browser resource and Coral Coast paint metrics',{timeout:90000},async()=>{
  const {page,context,exceptions}=await mobilePage(390,844);
  try{
    const started=Date.now();
    await page.goto(origin+'/index.html',{waitUntil:'load'});
    await page.waitForFunction(()=>!document.querySelector('#welcomeScreen').inert);
    const home=await page.evaluate(async()=>{
      await Promise.all([...document.querySelectorAll('#welcomeScreen img')]
        .filter(img=>!img.hidden).map(img=>img.decode().catch(()=>null)));
      const resources=performance.getEntriesByType('resource');
      const nav=performance.getEntriesByType('navigation')[0];
      return {
        navigationDurationMs:Math.round(nav?.duration||0),
        domContentLoadedMs:Math.round(nav?.domContentLoadedEventEnd||0),
        loadEventEndMs:Math.round(nav?.loadEventEnd||0),
        resourceCount:resources.length,
        transferredBytes:Math.round(resources.reduce((n,r)=>n+(r.transferSize||0),0)),
        decodedHomeImages:[...document.querySelectorAll('#welcomeScreen img')]
          .filter(img=>img.naturalWidth>0).length
      };
    });
    await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
    await page.locator('#thV2Tutorial:not([hidden])').waitFor();
    await seedTutorialCompletion(page);
    await page.reload({waitUntil:'load'});
    await page.locator('#thV2World:not([hidden])').waitFor();
    await page.locator('.th-v2-world-pin.is-current').click();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    // The production map deliberately defers offscreen art. In this isolated
    // measurement, explicitly activate all six images, with a bounded wait,
    // before sampling a full-map scroll. Never alter production lazy loading.
    const beforeFullDecode=await page.locator('#thV2AreaCanvas .th-v2-art-base img')
      .evaluateAll(images=>images.filter(img=>img.naturalWidth>0).length);
    await page.locator('#thV2AreaCanvas .th-v2-art-base img')
      .evaluateAll(images=>images.forEach(img=>{img.loading='eager';}));
    await page.waitForFunction(()=>{
      const images=[...document.querySelectorAll('#thV2AreaCanvas .th-v2-art-base img')];
      return images.length===6&&images.every(img=>img.complete&&img.naturalWidth>0);
    },null,{timeout:20000});
    const coast=await page.evaluate(async()=>{
      const panels=[...document.querySelectorAll('#thV2AreaCanvas .th-v2-area-section')];
      const artworks=panels.map(panel=>panel.querySelector('.th-v2-art-base img'));
      const entries=performance.getEntriesByType('resource');
      const mapped=entries.filter(entry=>entry.name.includes('coral-coast-section-'));
      const byUrl=new Map();
      for(const entry of mapped)byUrl.set(entry.name,(byUrl.get(entry.name)||0)+1);
      const map=document.getElementById('thCampaignMap');
      const totalHeight=map.scrollHeight;
      const visibleHeight=map.clientHeight;
      let frames=0,maxFrameMs=0,averageFrameMs=0;
      await new Promise(resolve=>{
        const start=Math.max(0,totalHeight-visibleHeight);
        map.scrollTop=start;
        let last=performance.now();
        function sample(now){
          const delta=now-last;last=now;
          if(frames>0){maxFrameMs=Math.max(maxFrameMs,delta);averageFrameMs+=delta;}
          frames++;
          map.scrollTop=Math.round(start*(1-frames/45));
          if(frames>=45){averageFrameMs/=Math.max(1,frames-1);resolve();}
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      return {
        sections:panels.length,
        decodedSectionImages:artworks.filter(img=>img?.naturalWidth>0).length,
        imageResourceCount:mapped.length,
        uniqueImageResourceUrls:byUrl.size,
        maximumDuplicateResourceEntries:Math.max(0,...byUrl.values()),
        imageResources:mapped.map(entry=>({
          file:new URL(entry.name).pathname.split('/').pop(),
          initiator:entry.initiatorType,
          query:new URL(entry.name).search,
          bytes:entry.transferSize
        })),
        cssBackdrops:panels.map(panel=>getComputedStyle(panel.querySelector('.th-v2-art-base')).backgroundImage!=='none'),
        mapContentHeightPx:totalHeight,
        mapViewportHeightPx:visibleHeight,
        meanFrameIntervalMs:Math.round(averageFrameMs*10)/10,
        maxFrameIntervalMs:Math.round(maxFrameMs*10)/10
      };
    });
    assert.equal(coast.sections,6);
    assert.equal(coast.decodedSectionImages,6);
    // One WebP resource entry per section: the former CSS + img duplication
    // created 12 entries for six unique landscapes in Chromium.
    assert.equal(coast.imageResourceCount,6,'Duplicate map artwork requests');
    assert.equal(coast.uniqueImageResourceUrls,6);
    assert.ok(coast.cssBackdrops.every(active=>active===false),
      'A CSS image layer still duplicates the real map artwork');
    assert.ok(coast.mapContentHeightPx>coast.mapViewportHeightPx);
    assert.deepEqual(exceptions,[]);
    const metrics={kind:'CI diagnostics, not device performance benchmark',
      testViewport:'Chromium mobile 390x844, localhost/no-store, unthrottled',
      loadedAreaImagesBeforeForcedDecode:beforeFullDecode,
      mode:'all six map images forced eager for full-map scroll measurement',
      measuredAt:new Date(started).toISOString(),home,coast};
    fs.writeFileSync(path.join(output,'browser-performance-metrics.json'),
      JSON.stringify(metrics,null,2)+'\n');
    console.log('[Pathle performance diagnostics] '+JSON.stringify(metrics));
  }finally{await context.close();}
});


test('Android-like browser Back traverses level, area and World without skipping screens',{timeout:90000},async()=>{
  const {page,context,exceptions}=await mobilePage(360,740);
  try{
    await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
    await page.locator('#thV2Tutorial:not([hidden])').waitFor();
    await seedTutorialCompletion(page);
    await page.reload({waitUntil:'load'});
    await page.locator('#thV2World:not([hidden])').waitFor();
    await page.locator('.th-v2-world-pin.is-current').click();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    assert.equal(await page.evaluate(()=>window.PathleTreasureCampaign.getView()),'area');
    await page.goBack();
    await page.locator('#thV2World:not([hidden])').waitFor();
    assert.equal(await page.evaluate(()=>window.PathleTreasureCampaign.getView()),'world');
    await page.locator('.th-v2-world-pin.is-current').click();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    const first=page.locator('#thV2AreaCanvas .th-v2-node.is-next');
    assert.equal(await first.count(),1);
    await first.click();
    await page.locator('.th-panel:not([hidden])').waitFor();
    assert.equal(await page.evaluate(()=>window.PathleTreasureCampaign.getView()),'level');
    await page.goBack();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    assert.equal(await page.evaluate(()=>window.PathleTreasureCampaign.getView()),'area');
    await page.locator('#thV2AreaWorld').click();
    await page.locator('#thV2World:not([hidden])').waitFor();
    assert.equal(await page.evaluate(()=>window.PathleTreasureCampaign.getView()),'world');
    assert.deepEqual(exceptions,[],'Browser Back triggered a JavaScript exception');
  }finally{await context.close();}
});

test('Treasure Hunt progress and unrelated preferences survive reload and app-like page switching',{timeout:90000},async()=>{
  const {page,context,exceptions}=await mobilePage(390,844);
  try{
    await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
    await page.locator('#thV2Tutorial:not([hidden])').waitFor();
    await seedTutorialCompletion(page);
    await page.reload({waitUntil:'load'});
    await page.locator('#thV2World:not([hidden])').waitFor();
    const saved=await page.evaluate(async()=>{
      const storage=window.PathleStorage;
      const release=window.PathleTreasureReleaseV2;
      const solver=window.PathleTreasureSolver;
      const grading=window.PathleTreasureGrading;
      const api=window.PathleTreasureSaveV2;
      const levelId=release.catalog.areas.find(a=>a.id==='coral-coast').levelIds[0];
      const optimum=solver.solve(release.getById(levelId)).optimalMoves;
      const getFins=(id,moves)=>grading.rateMoves(
        moves,solver.solve(release.getById(id)).optimalMoves).fins;
      const committed=await api.commitBest(storage,release.catalog,levelId,
        optimum,optimum,getFins);
      if(!committed.firstClear)throw Error('Expected first clear in fresh browser profile');
      await storage.update(draft=>{
        draft.settings.sound=false;
        draft.extensions.acceptanceProbe={value:'keep'};
        return draft;
      });
      const snapshot=await storage.load();
      return {id:levelId,optimum,revision:snapshot.revision,
        record:snapshot.data.extensions.treasureHuntV2.records[levelId].bestMoves};
    });
    await page.goto(origin+'/index.html',{waitUntil:'load'});
    await page.locator('#welcomeScreen:not([hidden])').waitFor();
    const second=await context.newPage(); // Simulate switching to another tab/app.
    await second.goto(origin+'/index.html',{waitUntil:'load'});
    await second.close();
    await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
    await page.locator('#thV2World:not([hidden])').waitFor();
    const restored=await page.evaluate(async()=>{
      const snapshot=await window.PathleStorage.load();
      return {revision:snapshot.revision,sound:snapshot.data.settings.sound,
        probe:snapshot.data.extensions.acceptanceProbe,
        records:snapshot.data.extensions.treasureHuntV2.records};
    });
    assert.equal(restored.revision,saved.revision,'Opening a new screen modified the save');
    assert.equal(restored.sound,false,'Unrelated preferences were lost');
    assert.equal(restored.probe.value,'keep','Other save extensions were overwritten');
    assert.equal(restored.records[saved.id].bestMoves,saved.record);
    await page.locator('.th-v2-world-pin.is-current').click();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    assert.equal(await page.locator('#thV2AreaCanvas .th-v2-node.is-complete').count(),1);
    assert.equal(await page.locator('#thV2AreaCanvas .th-v2-node.is-next').count(),1);
    await screenshot(page,'coral-coast-saved-progress-390');
    assert.deepEqual(exceptions,[],'Navigation/reload triggered a browser exception');
  }finally{await context.close();}
});

test('six Coral Coast illustrations join without section gaps at phone/tablet sizes',{timeout:120000},async()=>{
  const measurements=[];
  for(const width of [320,390,768]){
    const {page,context,exceptions}=await mobilePage(width,844);
    try{
      await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
      await page.locator('#thV2Tutorial:not([hidden])').waitFor();
      await seedTutorialCompletion(page);
      await page.reload({waitUntil:'load'});
      await page.locator('#thV2World:not([hidden])').waitFor();
      await page.locator('.th-v2-world-pin.is-current').click();
      await page.locator('#thV2Area:not([hidden])').waitFor();
      await page.locator('#thV2AreaCanvas .th-v2-art-base img').evaluateAll(images=>{
        for(const image of images)image.loading='eager';
      });
      await page.waitForFunction(()=>{
        const all=[...document.querySelectorAll('#thV2AreaCanvas .th-v2-art-base img')];
        return all.length===6&&all.every(img=>img.complete&&img.naturalWidth>0);
      },null,{timeout:20000});
      const geometry=await page.evaluate(()=>{
        const sections=[...document.querySelectorAll('#thV2AreaCanvas .th-v2-area-section')];
        const map=document.getElementById('thCampaignMap');
        const rects=sections.map(el=>el.getBoundingClientRect());
        return {
          widths:rects.map(r=>r.width),
          heights:rects.map(r=>r.height),
          seams:rects.slice(1).map((r,i)=>Math.round((r.top-rects[i].bottom)*10)/10),
          scrollWidth:map.scrollWidth,
          clientWidth:map.clientWidth,
          scrollHeight:map.scrollHeight,
          clientHeight:map.clientHeight,
          markers:document.querySelectorAll('#thV2AreaCanvas .th-v2-node').length,
          markupSummary:document.querySelectorAll('.th-v2-map-explain').length
        };
      });
      measurements.push({width,...geometry});
      assert.equal(geometry.markers,60);
      assert.equal(geometry.markupSummary,0,'Retired footer explanation has returned');
      assert.equal(geometry.seams.length,5);
      if(width>=600){
        const expected=width*1846/852;
        assert.ok(geometry.heights.every(h=>Math.abs(h-expected)<2),
          'Tablet map artwork has been cropped or distorted: '+JSON.stringify(geometry.heights));
      }else{
        assert.ok(geometry.heights.every(h=>Math.abs(h-1300)<1),
          'Phone map geometry has changed from the approved 1300px sections');
      }
      assert.ok(geometry.seams.every(gap=>Math.abs(gap)<=2),
        'Illustrated sections have a visible layout gap at '+width+': '+geometry.seams);
      assert.ok(geometry.scrollHeight>geometry.clientHeight*2);
      const scroller=page.locator('#thCampaignMap');
      // Fully loaded images may still await asynchronous bitmap decoding;
      // otherwise a screenshot immediately after a six-section jump can
      // capture only the gradient fallback rather than the real artwork.
      await page.locator('#thV2AreaCanvas .th-v2-art-base img')
        .evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));});
      const painted=()=>page.evaluate(()=>new Promise(resolve=>
        requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await scroller.evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'));});
      await painted();
      await screenshot(page,'coral-coast-final-top-'+width);
      await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll'));});
      await painted();
      await screenshot(page,'coral-coast-final-bottom-'+width);
      assert.deepEqual(exceptions,[],'JavaScript error during map scroll at '+width);
    }finally{await context.close();}
  }
  fs.writeFileSync(path.join(output,'coral-coast-layout-audit.json'),
    JSON.stringify(measurements,null,2)+'\n');
  console.log('[Pathle layout audit] '+JSON.stringify(measurements));
});


test('Android Back dismisses the completed Treasure Hunt result before returning to Coral Coast',{timeout:90000},async()=>{
  const {page,context,exceptions}=await mobilePage(390,844);
  try{
    await page.goto(origin+'/treasure-hunt.html',{waitUntil:'load'});
    await page.locator('#thV2Tutorial:not([hidden])').waitFor();
    await seedTutorialCompletion(page);
    await page.reload({waitUntil:'load'});
    await page.locator('#thV2World:not([hidden])').waitFor();
    await page.locator('.th-v2-world-pin.is-current').click();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    await page.locator('#thV2AreaCanvas .th-v2-node.is-next').click();
    await page.locator('.th-panel:not([hidden])').waitFor();
    await page.evaluate(()=>{
      const release=window.PathleTreasureReleaseV2;
      const solver=window.PathleTreasureSolver;
      const engine=window.PathleTreasureEngine;
      const index=3; // First Coral Coast level, after the three tutorials.
      const level=release.levels[index];
      let run=engine.createRun(level);
      for(const to of solver.solve(level).path.slice(1)){
        const step=engine.applyAction(level,run,{type:'move',to});
        if(!step.accepted)throw Error('Solver generated an invalid step');
        run=step.state;
      }
      if(!run.completed)throw Error('Could not complete the test puzzle');
      document.dispatchEvent(new CustomEvent('pathle:treasure-complete',{
        detail:{level,run,levelIndex:index}
      }));
    });
    await page.locator('#thVictory:not([hidden])').waitFor();
    assert.equal(await page.locator('.th-shell').evaluate(el=>el.inert),true);
    await page.goBack();
    await page.locator('#thV2Area:not([hidden])').waitFor();
    await page.locator('#thVictory').waitFor({state:'hidden'});
    assert.equal(await page.locator('.th-shell').evaluate(el=>el.inert),false,
      'A stale victory backdrop still blocks the map');
    assert.equal(await page.locator('#thV2AreaCanvas .th-v2-node.is-complete').count(),1);
    assert.equal(await page.evaluate(()=>window.PathleTreasureCampaign.getView()),'area');
    assert.deepEqual(exceptions,[],'Back from the result raised a JavaScript error');
  }finally{await context.close();}
});
