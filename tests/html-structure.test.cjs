'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
test('both Pathle entry pages have exactly one leading HTML5 doctype',()=>{
  for(const name of ['index.html','treasure-hunt.html']){
    const html=fs.readFileSync(path.join(root,name),'utf8');
    assert.match(html,/^<!DOCTYPE html>\s*<html\b/i,name+' must start in standards mode');
    assert.equal((html.match(/<!DOCTYPE html>/gi)||[]).length,1,
      name+' must not repeat obsolete doctype prefixes');
    for(const tag of ['html','head','body']){
      assert.equal((html.match(new RegExp('<'+tag+'(?:\\s|>)','gi'))||[]).length,1,
        'Duplicate '+tag+' element in '+name);
    }
  }
});
