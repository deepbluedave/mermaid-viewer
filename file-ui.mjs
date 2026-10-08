import {createFileSession,createRecoveryStore,newSessionId} from './files.mjs';
import {createRecentFiles,readAutosavePreference,writeAutosavePreference,AUTOSAVE_PREFERENCE} from './recent-files.mjs';
import {validateModel} from './core.mjs?v=extensions-10';

const $=id=>document.getElementById(id);
const fileTypes=[{description:'Editable diagram project',accept:{'application/json':['.json']}}];
export function createProjectFiles(api){
  let started=false,switching=false,picking=false,nativeDisabled=false,recovery=null,recoveryStore=null,recoveryFailed=false,recoveryKey='',lastError=null,noticeKey='',inputApproval=null,hasRecovery=false;
  const supported=()=>!nativeDisabled&&window.isSecureContext&&typeof window.showOpenFilePicker==='function'&&typeof window.showSaveFilePicker==='function';
  try{let tabId=sessionStorage.getItem('diagram-studio.tab');if(!tabId){tabId=newSessionId();sessionStorage.setItem('diagram-studio.tab',tabId);}recoveryStore=createRecoveryStore(localStorage,tabId);recovery=recoveryStore.find({ownOnly:true});hasRecovery=Boolean(recoveryStore.find());}catch{recoveryFailed=true;}
  let preferenceStorage=null;try{preferenceStorage=localStorage;}catch{}
  const recentFiles=createRecentFiles();
  const session=createFileSession({autosave:readAutosavePreference(preferenceStorage),onChange:()=>{render();recover();api.update();},onError:err=>{lastError=err;render();api.status(err.message);}});
  function snapshot(){return JSON.stringify(validateModel(api.snapshot()),null,2);}
  function recover(){
    if(!started||switching||!recoveryStore)return;
    const s=session.state(),draft=api.sourceDraft(),key=JSON.stringify([s.text,draft,s.dirty,s.name]);if(key===recoveryKey)return;recoveryKey=key;
    try{if(s.dirty||draft!==null){recoveryStore.write({content:s.text,sourceDraft:draft,filename:s.name});hasRecovery=true;}else if(!recovery){recoveryStore.clear();hasRecovery=Boolean(recoveryStore.find());}}
    catch{recoveryFailed=true;render();}
  }
  function changed(){if(!started||switching)return;try{session.update(snapshot());recover();}catch{/* Only the last validated diagram is eligible for saving. */}}
  function render(){
    const s=session.state();$('file-name').textContent=s.name;$('file-state').textContent=s.label;
    $('file-state').dataset.state=s.paused?'paused':s.saving?'saving':s.dirty?'dirty':'saved';
    $('file-info').title=`${s.name} · ${s.connected?'Working file connected':supported()?'Use Save to choose a working file':'Download mode: this browser cannot update local files directly'}${s.autosave?' · Autosave on':''}${recoveryFailed?' · Browser recovery unavailable':''}`;
    $('file-info').dataset.connected=String(s.connected);$('file-info').dataset.direct=String(supported());
    $('file-info').dataset.autosave=String(s.autosave);
    $('btn-save').title=s.connected?`Save ${s.name} (Ctrl/Cmd+S)`:'Save project (Ctrl/Cmd+S)';
    const nextNotice=s.paused?JSON.stringify([s.paused,lastError?.message]):recovery?JSON.stringify([recovery.key,recovery.filename]):'';
    if(nextNotice===noticeKey)return;noticeKey=nextNotice;
    const notice=$('file-notice');notice.replaceChildren();notice.hidden=true;
    const action=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',fn);notice.append(b);};
    if(s.paused){
      notice.hidden=false;const p=document.createElement('p');p.textContent=lastError?.message||'Autosave paused. Your edits are still here.';notice.append(p);
      if(s.paused==='conflict'){action('Reload file',reload);action('Save as…',()=>save(true));action('Overwrite',()=>save(false,true));}
      else{action('Retry Save',()=>save());action('Save as…',()=>save(true));}
      action('Download a copy',downloadCopy);
    }else if(recovery){
      notice.hidden=false;const p=document.createElement('p');p.textContent=`Browser recovery available: ${recovery.filename||'Untitled'}. This is an unsaved recovery copy.`;notice.append(p);action('Restore recovery',restore);action(recoveryStore.owns(recovery)?'Discard recovery':'Dismiss recovery',()=>{try{if(recoveryStore.owns(recovery))recoveryStore.remove(recovery);}catch{}recovery=null;recoveryKey='';recover();render();});
    }
  }
  function ask(title,message,choices){
    return new Promise(resolve=>{
      const dialog=$('file-dialog');$('file-dialog-list').hidden=true;$('file-dialog-title').textContent=title;$('file-dialog-message').textContent=message;
      const host=$('file-dialog-actions');host.replaceChildren();
      const finish=value=>{dialog.close();dialog.oncancel=null;resolve(value);};
      for(const [value,label,disabled=false]of choices){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.addEventListener('click',()=>finish(value));host.append(b);}
      dialog.oncancel=event=>{event.preventDefault();finish('cancel');};dialog.showModal();host.querySelector('button:last-child').focus();
    });
  }
  async function guard(){
    if(!api.prepare())return false;changed();
    if(!session.state().dirty&&api.sourceDraft()===null)return true;
    const draft=api.sourceDraft()!==null,answer=await ask('Unsaved changes',draft?'Your Mermaid source has an unapplied draft. Apply it before saving, or discard it to continue.':'Save your current diagram before continuing?',[[ 'save','Save and continue',draft],['discard','Discard changes'],['cancel','Cancel']]);
    if(answer==='save')return await save()&&!session.state().dirty;
    return answer==='discard';
  }
  function fallback(err){if(err?.name==='SecurityError'||err?.name==='NotSupportedError'){nativeDisabled=true;render();api.status('Direct file access is unavailable here. Open and Save use file copies.');return true;}return false;}
  async function save(as=false,overwrite=false){
    if(picking||switching||!api.prepare())return false;changed();
    const s=session.state();
    if(!supported()){
      const text=snapshot();api.download(new Blob([text],{type:'application/json'}),s.name==='Untitled'?'diagram.mermaid-project.json':s.name.endsWith('.json')?s.name:'diagram.mermaid-project.json');session.markDownloaded(text);api.status('Project copy downloaded. This browser cannot save back to the original file.');return true;
    }
    let handle=null,baseline=null,unavailable=false;
    if(as||!s.connected){
      picking=true;
      try{handle=await window.showSaveFilePicker({suggestedName:s.name.endsWith('.json')?s.name:'diagram.mermaid-project.json',types:fileTypes});baseline=await(await handle.getFile()).text();}
      catch(err){if(err.name==='AbortError')return false;if(fallback(err))unavailable=true;else{api.error(err);return false;}}
      finally{picking=false;}
      if(unavailable)return save();
    }
    // Include edits made while the chooser was open. Keep editing enabled while
    // the write runs; a later edit remains dirty until its own write succeeds.
    changed();const ok=await session.save({handle,baseline,overwrite});if(ok){const saved=session.state();recentFiles.remember({handle:saved.handle,name:saved.name,content:saved.text});lastError=null;api.status(session.state().dirty?'File saved. Newer changes are waiting to save.':'Project saved to its working file.');render();}return ok;
  }
  function downloadCopy(){if(!api.prepare())return;changed();const s=session.state();api.download(new Blob([snapshot()],{type:'application/json'}),s.name.endsWith('.json')?s.name:'diagram.mermaid-project.json');api.status('Project copy downloaded. Working file and unsaved changes retained.');}
  async function toggleAutosave(){
    if(!api.prepare())return;changed();const s=session.state(),enabled=!s.autosave;
    const stored=writeAutosavePreference(preferenceStorage,enabled);session.setAutosave(enabled);
    api.status(!enabled?'Autosave off. Use Save to update the working file.':!supported()?'Autosave preference on. Direct saving is unavailable in this browser.':!s.connected?'Autosave on. Choose a working file with Save to start saving changes.':s.paused?'Autosave on, paused until you resolve the file issue.':'Autosave on. Changes save after one second of idle time.');
    if(enabled&&s.connected&&s.handle.queryPermission){session.stop();try{let granted=await s.handle.queryPermission({mode:'readwrite'});if(granted!=='granted')granted=await s.handle.requestPermission({mode:'readwrite'});if(granted!=='granted')throw new Error('Write access was not granted. Autosave preference is retained; use Save to reconnect.');if(session.state().generation===s.generation&&session.state().autosave)session.setAutosave(true);}catch(err){if(session.state().generation===s.generation){lastError=err;session.pause('permission');api.error(err);}}}
    if(!stored)api.status('Autosave preference applies to this session; browser storage is unavailable.');
  }
  window.addEventListener('storage',event=>{if(event.key===AUTOSAVE_PREFERENCE)session.setAutosave(event.newValue==='true');});
  async function settle(){api.lock(true,'Finishing file save…');try{await session.settle();}finally{api.lock(false);}}
  async function load(file,handle=null,{guarded=false}={}){
    if(picking||switching||(!guarded&&!await guard()))return false;
    switching=true;
    try{await settle();
      let raw;api.lock(true,'Reading project…');try{raw=await file.text();}finally{api.lock(false);}
      const json=/\.json$/i.test(file.name),ok=await api.load(raw,json);
      if(!ok)return false;
      const content=snapshot(),baseline=json?raw:null;
      session.setDocument({content,handle:json?handle:null,baseline,filename:json?file.name:'Untitled',saved:json&&JSON.stringify(validateModel(JSON.parse(raw)))===JSON.stringify(api.snapshot())});
      recentFiles.remember({handle,name:file.name,content:raw});
      lastError=null;recovery=null;recoveryKey='';api.newIdentity();api.status(json?(session.state().dirty?'Project opened. Labels were fitted and the 24-unit gap checked; save to retain the adjustments.':session.state().connected?'Project opened with its working file connected.':supported()?'Project opened as a copy. Use Save to choose its working file.':'Project opened. This browser uses downloaded copies.'):'Mermaid imported. Save creates an editable JSON project.');return true;
    }catch(err){api.error(err);return false;}
    finally{switching=false;recover();render();if(session.state().autosave)session.setAutosave(true);}
  }
  function fallbackOpen(){inputApproval={content:snapshot(),draft:api.sourceDraft()};$('file-input').click();}
  async function open(){
    if(picking||switching||!await guard())return;
    if(!supported()){fallbackOpen();return;}
    picking=true;let handle,file;
    try{[handle]=await window.showOpenFilePicker({multiple:false,types:[...fileTypes,{description:'Mermaid source',accept:{'text/plain':['.mmd','.mermaid','.txt']}}]});file=await handle.getFile();}
    catch(err){if(fallback(err))fallbackOpen();else if(err.name!=='AbortError')api.error(err);return;}
    finally{picking=false;}
    await load(file,handle,{guarded:true});
  }
  async function newDiagram(){
    if(picking||switching||!await guard())return;switching=true;
    try{await settle();api.clear();session.setDocument({content:snapshot(),saved:true});lastError=null;recovery=null;recoveryKey='';api.newIdentity();}finally{switching=false;recover();render();}
  }
  async function reload(){
    if(!session.state().handle||picking||switching||!api.prepare())return;
    const answer=await ask('Reload changed file','Reload the disk file and discard your current diagram edits?',[['reload','Reload file'],['cancel','Cancel']]);
    if(answer!=='reload')return;const handle=session.state().handle;try{await load(await handle.getFile(),handle,{guarded:true});}catch(err){api.error(err);}
  }
  async function restore(){
    if(!recovery||picking||switching||!await guard())return;const record=recovery;
    try{
      validateModel(JSON.parse(record.content));switching=true;await settle();
      const ok=await api.load(record.content,true);if(!ok)return;
      api.restoreDraft(record.sourceDraft);session.setDocument({content:snapshot(),filename:record.filename||'Untitled',saved:false});api.newIdentity();
      recovery=null;if(recoveryStore.owns(record))recoveryStore.remove(record);recoveryKey='';api.status('Browser recovery restored. Use Save to choose or reconnect the working file. Your browser autosave preference is retained.');
    }catch(err){api.error(err);}finally{switching=false;recover();render();}
  }
  async function openRecent(record){
    if(picking||switching||!await guard())return;
    let file;
    try{
      if(record.handle){
        picking=true;
        if(record.handle.queryPermission){let granted=await record.handle.queryPermission({mode:'read'});if(granted!=='granted')granted=await record.handle.requestPermission({mode:'read'});if(granted!=='granted')throw new Error('Access to this recent file was not granted. Open it with the file picker to reconnect.');}
        file=await record.handle.getFile();
      }else file={name:record.name,text:async()=>record.content};
    }catch(err){api.error(new Error(err.name==='NotFoundError'?'This recent file was moved or deleted. Use Open to find it again.':err.message));return;}
    finally{picking=false;}
    await load(file,record.handle||null,{guarded:true});
  }
  async function showRecent(){
    if(picking||switching)return;await recentFiles.refresh();
    const dialog=$('file-dialog'),list=$('file-dialog-list'),actions=$('file-dialog-actions');
    if(dialog.open)return;
    $('file-dialog-title').textContent='Recent files';$('file-dialog-message').textContent='Choose a file to open. Browser copies reopen the last imported copy.';
    list.hidden=false;list.replaceChildren();actions.replaceChildren();
    const close=()=>dialog.close();
    const records=recentFiles.list();
    for(const record of records){const row=document.createElement('div');row.className='recent-file-row';const choose=document.createElement('button');choose.className='recent-file';choose.setAttribute('aria-label',`Open ${record.name}`);const name=document.createElement('strong'),detail=document.createElement('span');name.textContent=record.name;detail.textContent=record.handle?'Local file':'Browser copy';choose.append(name,detail);choose.addEventListener('click',()=>{close();openRecent(record);});const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Remove ${record.name} from recent files`);remove.addEventListener('click',async()=>{await recentFiles.remove(record.id);row.remove();if(!list.children.length)list.textContent='No recent files yet.';});row.append(choose,remove);list.append(row);}
    if(!records.length)list.textContent='No recent files yet.';
    const done=document.createElement('button');done.textContent='Close';done.addEventListener('click',close);actions.append(done);
    dialog.showModal();(list.querySelector('button')||done).focus();
  }
  $('file-input').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';const approved=inputApproval;inputApproval=null;if(file)load(file,null,{guarded:Boolean(approved&&approved.content===snapshot()&&approved.draft===api.sourceDraft())});});
  window.addEventListener('beforeunload',event=>{if(!started)return;changed();recover();if(session.state().dirty||api.sourceDraft()!==null){event.preventDefault();event.returnValue='';}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){changed();recover();}});
  return{changed,render,load,state:()=>({...session.state(),supported:supported(),hasRecovery}),save,open,newDiagram,downloadCopy,toggleAutosave,showRecent,
    start(){session.setDocument({content:snapshot(),saved:true});started=true;render();},
    showRecovery(){try{recovery=recoveryStore?.find();if(!recovery)api.status('No browser recovery copy is available.');noticeKey='';render();}catch{api.status('Browser recovery is unavailable in this browser.');}},
    dialogOpen:()=>$('file-dialog').open};
}
