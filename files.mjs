export function newSessionId(cryptoSource=typeof crypto==='undefined'?null:crypto){return cryptoSource?.randomUUID?.()||'session-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);}

export class FileConflict extends Error {constructor(){super('This file changed on disk. Choose Reload, Save as, or Overwrite.');this.name='FileConflict';}}
export class FilePermission extends Error {constructor(){super('File access needs your permission. Use Save to reconnect, or download a copy.');this.name='FilePermission';}}

// A file connection belongs to one document generation. Every queued operation
// captures that generation and its handle; switching documents cancels old work.
export function createFileSession({onChange=()=>{},onError=()=>{},delay=1000,setTimer=setTimeout,clearTimer=clearTimeout,autosave:initialAutosave=false}={}){
  let generation=0,text='',savedText=null,name='Untitled',connection=null,autosave=Boolean(initialAutosave),paused=null,timer=null,queue=Promise.resolve(),downloaded=false;
  const inFlight=new Map();
  const state=()=>({generation,text,name,connected:Boolean(connection),handle:connection?.handle,dirty:text!==savedText,autosave,paused,saving:Boolean(inFlight.get(generation)),
    label:inFlight.get(generation)?'Saving…':paused?(autosave?'Autosave paused':'Save paused'):text!==savedText?'Unsaved changes':downloaded?'Downloaded copy':connection?'Saved':'Not saved to a file'});
  const emit=()=>onChange(state());
  const stop=()=>{if(timer!==null)clearTimer(timer);timer=null;};
  function schedule(){stop();if(autosave&&connection&&!paused&&text!==savedText)timer=setTimer(()=>{timer=null;save({automatic:true});},delay);}
  function setDocument({content,handle=null,baseline=null,filename='Untitled',saved=false}){
    stop();generation++;text=content;savedText=saved?content:null;name=handle?.name||filename;connection=handle?{handle,baseline}:null;paused=null;downloaded=false;schedule();emit();return generation;
  }
  function update(content){if(content===text)return;text=content;schedule();emit();}
  function setAutosave(enabled){autosave=Boolean(enabled);if(!autosave)stop();else schedule();emit();}
  function pause(reason){stop();paused=reason;emit();}
  function markDownloaded(content){savedText=content;downloaded=true;emit();}
  async function permission(handle,automatic){
    if(!handle.queryPermission)return;
    let result=await handle.queryPermission({mode:'readwrite'});
    if(result!=='granted'&&!automatic&&handle.requestPermission)result=await handle.requestPermission({mode:'readwrite'});
    if(result!=='granted')throw new FilePermission();
  }
  function save({handle=null,baseline=null,overwrite=false,automatic=false}={}){
    stop();const token=generation,snapshot=text,target=handle?{handle,baseline}:connection;
    if(!target){onError(new Error('Choose a working file before saving.'),state());return Promise.resolve(false);}
    const operation=async()=>{
      if(token!==generation||automatic&&snapshot!==text)return false;
      if(!handle&&snapshot===savedText&&!paused&&!overwrite)return true;
      inFlight.set(token,(inFlight.get(token)||0)+1);emit();
      let writable;
      try{
        await permission(target.handle,automatic);
        if(token!==generation)return false;
        const disk=await target.handle.getFile(),current=await disk.text();
        if(!overwrite&&target.baseline!==null&&current!==target.baseline)throw new FileConflict();
        if(token!==generation)return false;
        writable=await target.handle.createWritable();await writable.write(snapshot);await writable.close();writable=null;
        // A newly chosen file becomes the working file only after its write
        // succeeds. A cancelled/failed Save as retains the previous connection.
        target.baseline=snapshot;
        if(token===generation){connection=target;name=target.handle.name;savedText=snapshot;paused=null;downloaded=false;}
        return true;
      }catch(err){
        if(writable?.abort)try{await writable.abort();}catch{/* Retain the original write error. */}
        if(token===generation){paused=err.name==='FileConflict'?'conflict':err.name==='FilePermission'||err.name==='NotAllowedError'?'permission':'write';onError(err,state());}
        return false;
      }finally{inFlight.delete(token);if(token===generation){schedule();emit();}}
    };
    const result=queue.then(operation,operation);queue=result.catch(()=>{});return result;
  }
  async function settle(){stop();await queue;stop();}
  return{state,setDocument,update,setAutosave,pause,save,settle,markDownloaded,stop};
}

const PREFIX='diagram-studio.recovery.v1.';
// Recovery is deliberately separate from disk saves. Each tab owns its entry,
// so saving in one tab cannot erase another tab's unsaved diagram.
export function createRecoveryStore(storage,tabId){
  const key=PREFIX+tabId;
  return{
    write(record){storage.setItem(key,JSON.stringify({version:1,...record,time:Date.now()}));},
    clear(){storage.removeItem(key);},
    owns(record){return (record.key||key)===key;},
    find({ownOnly=false}={}){
      const records=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(!k?.startsWith(PREFIX)||ownOnly&&k!==key)continue;try{const value=JSON.parse(storage.getItem(k));if(value?.version===1&&typeof value.content==='string')records.push({...value,key:k});}catch{/* Ignore a corrupt entry without breaking the editor. */}}
      return records.sort((a,b)=>Number(b.key===key)-Number(a.key===key)||b.time-a.time)[0]||null;
    },
    remove(record){storage.removeItem(record.key||key);}
  };
}
