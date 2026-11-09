'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const idle=()=>new Promise(resolve=>setImmediate(resolve));

function node(id){
  const callbacks={};
  const classes=new Set();
  return {
    id,hidden:id==='updateModal'||id==='updateInstall',inert:false,disabled:false,
    textContent:'',title:'',attributes:{},
    classList:{
      add:k=>classes.add(k),remove:k=>classes.delete(k),
      toggle:(k,v)=>{if(v)classes.add(k);else classes.delete(k)},
      contains:k=>classes.has(k)
    },
    setAttribute(k,v){this.attributes[k]=v},
    addEventListener(k,fn){(callbacks[k]??=[]).push(fn)},
    focus(){this.focused=true},
    fire(k,more={}){for(const f of callbacks[k]??[])f({target:this,...more})}
  };
}
function harness({published='1.5.59',fetchError=false,fetchProvided=true}={}){
  const ids=[
    'homeBuildBadge','gameVersionFooter','updateModal','updateMessage',
    'updateLoadedVersion','updateRetry','updateInstall','updateClose','welcomeScreen'
  ];
  const nodes=Object.fromEntries(ids.map(id=>[id,node(id)]));
  const requests=[],navigation=[];
  const document={
    title:'before',baseURI:'https://haiko650.github.io/piiloreitti/',
    body:{classList:{contains:()=>false}},activeElement:null,
    getElementById:id=>nodes[id]||null
  };
  for(const item of Object.values(nodes)){
    item.focus=()=>{document.activeElement=item};
  }
  const root={
    location:{
      href:'https://haiko650.github.io/piiloreitti/index.html',
      assign:url=>navigation.push(url)
    }
  };
  if(fetchProvided){
    root.fetch=async(url,options)=>{
      requests.push({url,options});
      if(fetchError)throw new Error('Offline');
      return {ok:true,json:async()=>({version:published,channel:'DEV'})};
    };
  }
  vm.runInNewContext(read('js/version.js'),{window:root,document,URL});
  return {nodes,requests,navigation,document,root};
}

test('home screen version label is an accessible small update button',()=>{
  const html=read('index.html');
  const start=html.indexOf('<div class="welcomeTop">');
  const badge=html.indexOf('id="homeBuildBadge"',start);
  const tools=html.indexOf('class="topTools"',start);
  assert.ok(start>=0&&badge>start&&tools>badge);
  assert.match(html,/<button[^>]*id="homeBuildBadge"[^>]*>DEV · v1\.5\.59<\/button>/);
  assert.match(html,/js\/version\.js\?v=f527de340635/);
  // The menu URL must bust Treasure Hunt HTML cache, not just the index cache.
  assert.match(html,/id="playTreasure" href="treasure-hunt\.html\?v=1\.5\.59"/);
  assert.match(html,/css\/home-reef\.css\?v=28c5eadb8991/);
  assert.match(html,/id="gameVersionFooter"/);
  assert.match(html,/id="updateModal"/);
});

test('published manifest matches the installed version, and no duplicates linger',()=>{
  const json=JSON.parse(read('version.json'));
  assert.equal(json.version,'1.5.59');
  assert.equal(json.channel,'DEV');
  assert.match(read('js/version.js'),/const VERSION='1\.5\.59'/);
  assert.doesNotMatch(read('index.html'),/DEV · v1\.4\.0/);
});

test('version module updates label, title and Daily footer',async()=>{
  const h=harness();await idle();
  assert.equal(h.root.PathleVersion.version,'1.5.59');
  assert.equal(h.nodes.homeBuildBadge.textContent,'DEV · v1.5.59');
  assert.equal(h.document.title,'Pathle v1.5.59 · Ocean Journey');
  assert.equal(h.nodes.gameVersionFooter.textContent,'Pathle v1.5.59 · Ocean Journey (DEV)');
  assert.equal(h.nodes.updateModal.hidden,true);
});

test('update check uses fresh same-origin manifest without interrupting the game',async()=>{
  const h=harness();await idle();
  assert.equal(h.requests.length,1);
  const check=new URL(h.requests[0].url);
  assert.equal(check.origin,'https://haiko650.github.io');
  assert.equal(check.pathname,'/piiloreitti/version.json');
  assert.ok(check.searchParams.get('_'));
  assert.equal(h.requests[0].options.cache,'no-store');
  assert.equal(h.nodes.updateInstall.hidden,true);
  assert.equal(h.nodes.updateModal.hidden,true);
  assert.equal(h.navigation.length,0);
  h.nodes.homeBuildBadge.fire('click');await idle();
  assert.equal(h.nodes.updateModal.hidden,false);
  assert.match(h.nodes.updateMessage.textContent,/latest published version/);
  assert.equal(h.requests.length,2);
});

test('a newer published build offers voluntary refresh with cache-busting query',async()=>{
  const h=harness({published:'1.5.60'});await idle();
  assert.equal(h.nodes.homeBuildBadge.classList.contains('has-update'),true);
  assert.equal(h.navigation.length,0);
  h.nodes.homeBuildBadge.fire('click');await idle();
  assert.match(h.nodes.updateMessage.textContent,/1\.5\.60/);
  assert.equal(h.nodes.updateInstall.hidden,false);
  assert.equal(h.nodes.updateInstall.textContent,'Load v1.5.60');
  h.nodes.updateInstall.fire('click');
  assert.equal(h.navigation.length,1);
  const dest=new URL(h.navigation[0]);
  assert.equal(dest.origin,'https://haiko650.github.io');
  assert.equal(dest.pathname,'/piiloreitti/index.html');
  assert.equal(dest.searchParams.get('pathle-update'),'1.5.60');
  assert.match(dest.searchParams.get('fresh'),/^\d+$/,
    'Explicit update navigation must bypass previously cached home HTML');
});

test('no page refresh when game screen is open, even if update was discovered',async()=>{
  const h=harness({published:'1.5.60'});await idle();
  h.nodes.homeBuildBadge.fire('click');await idle();
  h.nodes.welcomeScreen.hidden=true;
  h.nodes.updateInstall.fire('click');
  assert.deepEqual(h.navigation,[]);
});

test('offline or malformed update information never claims current or prompts refresh',async()=>{
  for(const options of [{fetchError:true},{published:'broken'}]){
    const h=harness(options);await idle();
    h.nodes.homeBuildBadge.fire('click');await idle();
    assert.match(h.nodes.updateMessage.textContent,/Could not check/);
    assert.equal(h.nodes.updateInstall.hidden,true);
    assert.equal(h.navigation.length,0);
  }
});

test('version script safely works on older pages without update controls',()=>{
  const window={};
  const document={title:'',getElementById:()=>null};
  vm.runInNewContext(read('js/version.js'),{window,document});
  assert.equal(window.PathleVersion.version,'1.5.59');
});

test('closing the update dialog returns focus to the version button',async()=>{
  const h=harness();await idle();
  h.nodes.homeBuildBadge.fire('click');await idle();
  assert.equal(h.nodes.welcomeScreen.inert,true);
  h.nodes.updateClose.fire('click');
  assert.equal(h.nodes.updateModal.hidden,true);
  assert.equal(h.nodes.welcomeScreen.inert,false);
  assert.equal(h.document.activeElement,h.nodes.homeBuildBadge);
});

test('version layout is compact and does not reposition other menu elements',()=>{
  const css=read('css/home-reef.css');
  assert.match(css,/#welcomeScreen \.welcomeTop \.homeBuildBadge\s*\{/);
  assert.match(css,/left:50%;\s*transform:translateX\(-50%\)/);
  assert.match(css,/font-size:11px;/);
  assert.match(css,/#welcomeScreen \.welcomeTop button\.homeBuildBadge\s*\{/);
  assert.match(css,/pointer-events:auto;/);
  assert.match(css,/@media \(max-width:360px\)/);
});
