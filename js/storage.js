/* Pathle 5B.1 — IndexedDB adapter. Not yet connected to game.js.
   Lazy initialization: the database is opened only when load()/save() is called. */
(()=>{'use strict';
  const DB_NAME='pathle_game_saves';
  const DB_VERSION=1;
  const STORE='snapshots';
  const schema=window.PathleSaveSchema;
  if(!schema)throw new Error('Load save-schema.js before storage.js');
  let dbPromise=null;
  let writeQueue=Promise.resolve();

  function openDatabase(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      let request;
      try{
        if(!('indexedDB' in window))throw new Error('IndexedDB is unavailable in this browser');
        request=indexedDB.open(DB_NAME,DB_VERSION);
      }catch(error){reject(error);return}
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'slot'});
      };
      request.onerror=()=>reject(request.error||new Error('Could not open Pathle save database'));
      request.onblocked=()=>reject(new Error('Pathle save database is blocked by another tab'));
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{db.close();dbPromise=null};
        resolve(db);
      };
    }).catch(error=>{dbPromise=null;throw error});
    return dbPromise;
  }

  function checkRecord(record){
    return record&&Number.isSafeInteger(record.revision)&&record.revision>=1&&
      Number.isFinite(record.updatedAt)&&schema.validateSave(record.payload).valid;
  }

  function copyJson(data){
    const raw=JSON.stringify(data);
    if(typeof raw!=='string')throw new Error('Save must be JSON-serializable');
    return JSON.parse(raw);
  }

  // Returns {data,revision,updatedAt,source} or null. If the newest snapshot
  // is malformed, a previous valid snapshot can still be recovered.
  async function load(){
    await writeQueue;
    const db=await openDatabase();
    return new Promise((resolve,reject)=>{
      let primary,backup,finished=false;
      const tx=db.transaction(STORE,'readonly');
      const store=tx.objectStore(STORE);
      const a=store.get('current'),b=store.get('previous');
      a.onsuccess=()=>{primary=a.result};
      b.onsuccess=()=>{backup=b.result};
      tx.oncomplete=()=>{
        finished=true;
        if(checkRecord(primary))resolve({data:copyJson(primary.payload),revision:primary.revision,updatedAt:primary.updatedAt,source:'current'});
        else if(checkRecord(backup))resolve({data:copyJson(backup.payload),revision:backup.revision,updatedAt:backup.updatedAt,source:'previous'});
        else if(primary||backup)reject(new Error('Pathle save exists, but neither snapshot is valid'));
        else resolve(null);
      };
      tx.onabort=()=>{if(!finished)reject(tx.error||new Error('Pathle save read aborted'))};
      tx.onerror=()=>{ /* Transaction abort will reject. */ };
    });
  }

  async function writeSnapshot(data){
    const candidate=copyJson(data);
    const result=schema.validateSave(candidate);
    if(!result.valid)throw new Error(`Refusing invalid Pathle save: ${result.errors.join('; ')}`);
    const db=await openDatabase();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      const store=tx.objectStore(STORE);
      const req=store.get('current');
      let written=null;
      req.onsuccess=()=>{
        const old=req.result;
        const previousRev=old&&Number.isSafeInteger(old.revision)&&old.revision>0?old.revision:0;
        written={slot:'current',revision:previousRev+1,updatedAt:Date.now(),payload:candidate};
        // Both writes belong to the SAME transaction; either both commit or neither does.
        if(checkRecord(old))store.put({...old,slot:'previous'});
        store.put(written);
      };
      tx.oncomplete=()=>resolve({revision:written.revision,updatedAt:written.updatedAt});
      tx.onabort=()=>reject(tx.error||new Error('Pathle save write aborted'));
      tx.onerror=()=>{ /* Transaction abort will reject. */ };
    });
  }

  // Serialize writes, so a slow earlier save cannot overwrite a newer one.
  function save(data){
    // Capture the value now, even when another write is still queued.
    const snapshot=copyJson(data);
    const next=writeQueue.then(()=>writeSnapshot(snapshot));
    writeQueue=next.catch(()=>{});
    return next;
  }

  window.PathleStorage=Object.freeze({load,save,openDatabase,DB_NAME,DB_VERSION});
})();
