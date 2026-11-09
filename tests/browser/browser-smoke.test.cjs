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
