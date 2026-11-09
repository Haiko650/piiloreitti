'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const sha=data=>crypto.createHash('sha1')
  .update('blob '+data.length+'\0').update(data).digest('hex').slice(0,12);

test('CSS image URLs and enclosing CSS links follow the referenced asset fingerprints',()=>{
  const images=[
    {css:'css/styles.css',src:'../images/home-background.webp',
      image:'images/home-background.webp',page:'index.html'},
    {css:'css/home-reef.css',src:'../images/home-reef-background.webp',
      image:'images/home-reef-background.webp',page:'index.html'},
    {css:'css/treasure-world-ui.css',
      src:'../images/maps/water-world/coral-coast/section-01-base.svg',
      image:'images/maps/water-world/coral-coast/section-01-base.svg',
      page:'treasure-hunt.html'}
  ];
  for(const item of images){
    const css=read(item.css);
    const imageHash=sha(read(item.image));
    assert.ok(css.toString('utf8').includes(item.src+'?v='+imageHash),
      'CSS image did not receive the correct asset fingerprint: '+item.image);
    const html=read(item.page).toString('utf8');
    assert.ok(html.includes(item.css+'?v='+sha(css)),
      'Page did not receive CSS content hash for '+item.css);
  }
});
