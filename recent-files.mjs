export const AUTOSAVE_PREFERENCE='diagram-studio.autosave';
export function readAutosavePreference(storage){try{return storage.getItem(AUTOSAVE_PREFERENCE)==='true';}catch{return false;}}
export function writeAutosavePreference(storage,value){try{storage.setItem(AUTOSAVE_PREFERENCE,String(Boolean(value)));return true;}catch{return false;}}

// Handles live in IndexedDB; browser copies are explicitly identified by the UI.
// A transaction merges each update with current disk records so concurrent tabs
// cannot erase each other's recent files. Storage failures retain a session list.
export function createRecentFiles({indexedDB=globalThis.indexedDB,limit=10}={}){
  let records=[],database=null,queue=Promise.resolve();
  const valid=record=>record&&typeof record.id==='string'&&typeof record.name==='string'&&typeof record.content==='string'&&Number.isFinite(record.time);
  const ordered=rows=>rows.filter(valid).sort((a,b)=>b.time-a.time).slice(0,limit);
  async function db(){
    if(!indexedDB)return null;
    if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('diagram-studio-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('recent',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    return database;
  }
  function retainHandles(rows){return ordered(rows).map(row=>{const local=records.find(r=>r.id===row.id);return local?.handle&&!row.handle?{...row,handle:local.handle}:row;});}
  async function read(){
    const connection=await db();if(!connection)return records;
    return new Promise((resolve,reject)=>{const tx=connection.transaction('recent','readonly'),request=tx.objectStore('recent').getAll();let rows;request.onsuccess=()=>{rows=request.result;};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  }
  async function refresh(){try{records=retainHandles(await read());}catch{/* Keep the session list when storage is blocked. */}}
  const ready=refresh();
  function enqueue(fn){const result=queue.then(fn,fn);queue=result.catch(()=>{});return result;}
  async function change({record=null,remove=[],clear=false}={}){
    const connection=await db();if(!connection)return null;
    return new Promise((resolve,reject)=>{
      const tx=connection.transaction('recent','readwrite'),store=tx.objectStore('recent'),request=store.getAll();let rows,writeError;
      tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(writeError||tx.error);tx.onabort=()=>reject(writeError||tx.error);
      request.onsuccess=()=>{
        try{
          rows=ordered([...(record?[record]:[]),...(clear?[]:request.result).filter(r=>!remove.includes(r.id)&&r.id!==record?.id)]);
          if(clear)store.clear();else for(const old of request.result)if(!rows.some(r=>r.id===old.id))store.delete(old.id);
          if(record)store.put(record);
        }catch(err){writeError=err;tx.abort();}
      };
    });
  }
  return{
    ready,
    settle:async()=>{await ready;await queue;},
    refresh:()=>enqueue(async()=>{await ready;await refresh();}),
    list:()=>records.map(record=>({...record})),
    remember({handle=null,name,content}){return enqueue(async()=>{
      await ready;await refresh();const matches=[];
      for(const record of records){if(handle&&record.handle){try{if(handle===record.handle||await handle.isSameEntry?.(record.handle))matches.push(record);}catch{}}else if(!handle&&!record.handle&&record.name===name)matches.push(record);}
      const record={id:matches[0]?.id||'recent-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name,content,handle,time:Math.max(Date.now(),(records[0]?.time||0)+1)},remove=matches.map(r=>r.id);
      let stored=null;
      try{stored=await change({record,remove});}catch{try{const {handle,...copy}=record;stored=await change({record:copy,remove});}catch{/* Retain the current session record. */}}
      records=stored?retainHandles(stored).map(r=>r.id===record.id?record:r):ordered([record,...records.filter(r=>!remove.includes(r.id))]);return record;
    });},
    remove(id){return enqueue(async()=>{await ready;try{const stored=await change({remove:[id]});records=stored?retainHandles(stored):records.filter(r=>r.id!==id);}catch{records=records.filter(r=>r.id!==id);}});},
    clear(){return enqueue(async()=>{await ready;try{await change({clear:true});}catch{}records=[];});}
  };
}
