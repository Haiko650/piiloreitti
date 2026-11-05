'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('home screen exposes the current version between Settings and DEV controls',()=>{
  const html=read('index.html');
  const start=html.indexOf('<div class="welcomeTop">');
  const badge=html.indexOf('id="homeBuildBadge"',start);
  const tools=html.indexOf('class="topTools"',start);
  assert.ok(start>=0 && badge>start && tools>badge);
  assert.match(html,/DEV · v1\.4\.0/);
  assert.match(html,/js\/version\.js\?v=1\.4\.0/);
  assert.match(html,/css\/home-reef\.css\?v=20261105-1/);
  assert.match(html,/id="gameVersionFooter"/);
});

test('single version module synchronizes label, document title and Daily footer',()=>{
  const badge={textContent:'',attributes:{},setAttribute(key,value){this.attributes[key]=value}};
  const footer={textContent:''};
  const document={
    title:'before',
    getElementById:id=>id==='homeBuildBadge'?badge:id==='gameVersionFooter'?footer:null
  };
  const window={};
  vm.runInNewContext(read('js/version.js'),{window,document});
  assert.equal(window.PathleVersion.version,'1.4.0');
  assert.equal(window.PathleVersion.channel,'DEV');
  assert.equal(badge.textContent,'DEV · v1.4.0');
  assert.equal(badge.attributes['aria-label'],'Pathle development version 1.4.0');
  assert.equal(document.title,'Pathle v1.4.0 · Ocean Journey');
  assert.equal(footer.textContent,'Pathle v1.4.0 · Ocean Journey (DEV)');
});

test('version module safely runs on pages without badge or footer',()=>{
  const window={};
  vm.runInNewContext(read('js/version.js'),{window,document:{title:'',getElementById:()=>null}});
  assert.equal(window.PathleVersion.version,'1.4.0');
});

test('version CSS stays compact, centered, and does not move the menu',()=>{
  const css=read('css/home-reef.css');
  assert.match(css,/#welcomeScreen \.welcomeTop \.homeBuildBadge\s*\{/);
  assert.match(css,/left:50%;\s*transform:translateX\(-50%\)/);
  assert.match(css,/font-size:11px;/);
  assert.match(css,/pointer-events:none;/);
  assert.match(css,/@media \(max-width:360px\)/);
  assert.ok(!css.includes('position:sticky'));
});
