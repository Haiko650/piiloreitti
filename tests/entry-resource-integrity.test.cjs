'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const root=path.resolve(__dirname,'..');
const asText=p=>fs.readFileSync(path.join(root,p),'utf8');
const blobHash=bytes=>crypto.createHash('sha1')
  .update('blob '+bytes.length+'\0').update(bytes).digest('hex').slice(0,12);

test('player-facing pages use existing, fingerprinted local JS, CSS and image assets',()=>{
  for(const page of ['index.html','treasure-hunt.html']){
    const html=asText(page);
    const references=[...html.matchAll(/\b(?:src|href)=(["'])([^"']+\.(?:css|js|svg|png|webp)(?:\?[^"']*)?)\1/gi)]
      .map(match=>match[2]);
    assert.ok(references.length>=10,page+' has unexpectedly few asset references');
    for(const url of references){
      assert.ok(!/^https?:|^\/\//i.test(url),'External runtime asset: '+url);
      const [filename,query]=url.split('?');
      const normalized=path.posix.normalize(filename);
      assert.ok(!normalized.startsWith('../')&&!path.isAbsolute(normalized),
        'Asset escapes repository root: '+url);
      const absolute=path.join(root,normalized);
      assert.ok(fs.existsSync(absolute),'Missing local asset: '+url);
      assert.equal((query||'').match(/^v=([a-f0-9]{12})$/)?.[1],
        blobHash(fs.readFileSync(absolute)),
        'Stale generated asset revision: '+page+' → '+url);
    }
  }
});

test('only current player-facing controller modules are loaded by HTML',()=>{
  const home=asText('index.html');
  const treasure=asText('treasure-hunt.html');
  assert.match(home,/src="js\/game\.js\?v=[a-f0-9]{12}"/);
  assert.match(treasure,/src="js\/treasure-campaign-v2\.js\?v=[a-f0-9]{12}"/);
  for(const retired of ['treasure-bootstrap','treasure-campaign','treasure-progress',
    'treasure-levels','treasure-preview']){
    assert.doesNotMatch(treasure,
      new RegExp('src="js/'+retired+'\\.js\\?v='),
      'Retired entry point unexpectedly loaded: '+retired);
  }
  assert.ok(fs.existsSync(path.join(root,'piiloreitti-backup.html')),
    'Historical backup must remain accessible for intentional rollback');
});

test('temporary raw Haiko transfer artifact is not committed',()=>{
  assert.equal(fs.existsSync(path.join(root,'docs/.haiko-upright-base64.tmp')),false,
    'Remove retired temporary base64 transfer file from the repository');
});
