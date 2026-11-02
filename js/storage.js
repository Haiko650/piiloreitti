/* Pathle 5B.3B.1 — IndexedDB adapter, atomic updates and three snapshots.
   Lazy initialization: the database opens only when storage is used. */
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

  // Detect unintended changes even when a damaged payload happens to remain
  // structurally valid. This is a corruption check, NOT a security signature.
  // Old stage-5B snapshots have no checksum and remain readable.
  function checksum(payload){
    const text=JSON.stringify(payload);
    if(typeof text!=='string')return null;
    let value=2166136261;
    for(let i=0;i<text.length;i++){value^=text.charCodeAt(i);value=Math.imul(value,16777619)}
    return (value>>>0).toString(16).padStart(8,'0');
  }
  function checkRecord(record){
    return !!record&&Number.isSafeInteger(record.revision)&&record.revision>=1&&
      Number.isFinite(record.updatedAt)&&schema.validateSave(record.payload).valid&&
      (record.checksum===undefined||record.checksum===checksum(record.payload));
  }

  function copyJson(data){
    const raw=JSON.stringify(data);
    if(typeof raw!=='string')throw new Error('Save must be JSON-serializable');
    return JSON.parse(raw);
  }

  // Keep current, previous, recovery snapshots in the SAME IndexedDB store.
  // No schema/database upgrade is required: slots are ordinary record keys.
  const SLOTS=['current','previous','recovery'];
  function newestValid(records){
    return records.filter(checkRecord).sort((a,b)=>b.revision-a.revision||
      SLOTS.indexOf(a.slot)-SLOTS.indexOf(b.slot));
  }
  function readSlots(store,callback){
    const records=[];
    let remaining=SLOTS.length;
    for(const slot of SLOTS){
      const request=store.get(slot);
      request.onsuccess=()=>{
        if(request.result)records.push(request.result);
        if(!--remaining)callback(records);
      };
    }
  }
  function nextRevision(records){
    return Math.max(0,...records.filter(record=>record&&Number.isSafeInteger(record.revision)&&record.revision>=1)
      .map(record=>record.revision))+1;
  }
  // All snapshot rotations happen in the same readwrite transaction. A failed
  // transaction cannot leave backups or the current save half-updated.
  function commitSnapshot(store,records,candidate){
    const valid=newestValid(records);
    const written={slot:'current',revision:nextRevision(records),updatedAt:Date.now(),payload:candidate,checksum:checksum(candidate)};
    store.put(written);
    if(valid[0])store.put({...valid[0],slot:'previous'});
    else store.delete('previous');
    if(valid[1])store.put({...valid[1],slot:'recovery'});
    else store.delete('recovery');
    return written;
  }

  // Returns {data,revision,updatedAt,source} or null.
  // If current is damaged, recover the newest valid backup without changing it.
  async function load(){
    await writeQueue;
    const db=await openDatabase();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const store=tx.objectStore(STORE);
      let records=[];
      readSlots(store,found=>{records=found});
      tx.oncomplete=()=>{
        const valid=newestValid(records);
        const chosen=valid[0];
        if(chosen)resolve({data:copyJson(chosen.payload),revision:chosen.revision,updatedAt:chosen.updatedAt,source:chosen.slot});
        else if(records.length)reject(new Error('Pathle save exists, but no snapshot is valid. Data has not been deleted.'));
        else resolve(null);
      };
      tx.onabort=()=>reject(tx.error||new Error('Pathle save read aborted'));
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
      let written=null,reason=null;
      readSlots(store,records=>{
        try{
          // Never silently replace existing but unrecoverable data with a
          // fresh save. The user must choose a deliberate recovery later.
          if(records.length&&!newestValid(records).length)
            throw new Error('Existing Pathle saves are invalid; refusing to overwrite them');
          written=commitSnapshot(store,records,candidate);
        }catch(error){reason=error;try{tx.abort()}catch{}}
      });
      tx.oncomplete=()=>resolve({revision:written.revision,updatedAt:written.updatedAt});
      tx.onabort=()=>reject(reason||tx.error||new Error('Pathle save write aborted'));
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

  // Atomically modify the LATEST valid snapshot. This keeps rewards,
  // settings, Daily progress and future content from overwriting each other.
  // The updater MUST be synchronous; IndexedDB transactions cannot await it.
  function update(mutator){
    if(typeof mutator!=='function')return Promise.reject(new TypeError('Save updater must be a function'));
    const next=writeQueue.then(async()=>{
      const db=await openDatabase();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        const store=tx.objectStore(STORE);
        let written=null,reason=null;
        readSlots(store,records=>{
          try{
            const base=newestValid(records)[0];
            if(!base)throw new Error('No valid Pathle save available for update');
            const draft=copyJson(base.payload);
            const returned=mutator(draft);
            if(returned&&typeof returned.then==='function')throw new TypeError('Save updater must not be async');
            const candidate=copyJson(returned===undefined?draft:returned);
            const status=schema.validateSave(candidate);
            if(!status.valid)throw new Error(`Refusing invalid Pathle save: ${status.errors.join('; ')}`);
            written=commitSnapshot(store,records,candidate);
          }catch(error){reason=error;try{tx.abort()}catch{}}
        });
        tx.oncomplete=()=>resolve({revision:written.revision,updatedAt:written.updatedAt});
        tx.onabort=()=>reject(reason||tx.error||new Error('Pathle save update aborted'));
      });
    });
    writeQueue=next.catch(()=>{});
    return next;
  }

  window.PathleStorage=Object.freeze({load,save,update,openDatabase,DB_NAME,DB_VERSION});
})();
