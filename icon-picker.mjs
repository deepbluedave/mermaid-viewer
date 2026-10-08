import {iconCatalog,searchIcons,ensureIconPacks,iconData,iconBody,iconLabel,iconPacks} from './icons.mjs?v=icons-3';
const ns='http://www.w3.org/2000/svg';
export function iconPreview(reference,size=32){
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',iconData(reference).viewBox);svg.setAttribute('width',size);svg.setAttribute('height',size);svg.setAttribute('aria-hidden','true');if(iconPacks.find(p=>p.prefix===reference?.split(':')[0])?.palette)svg.classList.add('palette-icon');svg.innerHTML=iconBody(reference);return svg;
}
export function createIconPicker(){
 const dialog=document.createElement('dialog');dialog.id='icon-picker';dialog.setAttribute('aria-labelledby','icon-picker-title');
 dialog.innerHTML='<header class="icon-picker-header"><h2 id="icon-picker-title">Choose an icon</h2><button type="button" id="icon-picker-close" aria-label="Close icon picker">×</button></header><div class="icon-picker-filters"><label class="visually-hidden" for="icon-picker-search">Search icons</label><input type="search" id="icon-picker-search" placeholder="Search icons · person, agent, cloud…" autocomplete="off" spellcheck="false"><label class="visually-hidden" for="icon-picker-pack">Icon pack</label><select id="icon-picker-pack"><option value="">All packs</option></select></div><p id="icon-picker-status" role="status" aria-live="polite"></p><div id="icon-picker-results" class="icon-picker-results" role="group" aria-label="Matching icons"></div><div class="icon-picker-footer"><button type="button" id="icon-picker-more" hidden>Show more</button><button type="button" id="icon-picker-cancel">Cancel</button></div>';
 document.body.append(dialog);
 const search=dialog.querySelector('#icon-picker-search'),filter=dialog.querySelector('#icon-picker-pack'),status=dialog.querySelector('#icon-picker-status'),grid=dialog.querySelector('#icon-picker-results'),more=dialog.querySelector('#icon-picker-more');
 for(const p of iconPacks){const option=document.createElement('option');option.value=p.prefix;option.textContent=p.name;filter.append(option);}
 let session=null,catalog=null,request=0,visible=96;
 function close(){const focus=session?.returnFocus;request++;dialog.close();session=null;if(focus?.isConnected)focus.focus({preventScroll:true});}
 dialog.querySelector('#icon-picker-close').addEventListener('click',close);dialog.querySelector('#icon-picker-cancel').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('keydown',event=>{
  // Keep global canvas shortcuts and save commands out of the modal.
  event.stopPropagation();
  if(event.key==='Escape'){event.preventDefault();close();return;}
  const card=event.target.closest('[data-icon]');
  if(card&&['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();const cards=[...grid.querySelectorAll('button')],index=cards.indexOf(card),columns=Math.max(1,Math.floor(grid.clientWidth/card.offsetWidth)),step={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[event.key];
   cards[event.key==='Home'?0:event.key==='End'?cards.length-1:Math.max(0,Math.min(cards.length-1,index+step))]?.focus();
  }
 });
 async function render(){
  const token=++request,current=session;if(!current)return;status.textContent='Loading bundled icons…';more.hidden=true;grid.setAttribute('aria-busy','true');for(const button of grid.querySelectorAll('button'))button.disabled=true;
  try{
   catalog||=await iconCatalog();const result=searchIcons(catalog,search.value,filter.value,0,visible);
   await ensureIconPacks(result.items.map(i=>i.reference));if(token!==request||session!==current)return;
   grid.replaceChildren();
   for(const item of result.items){
    const card=document.createElement('button');card.type='button';card.className='icon-picker-card';card.dataset.icon=item.reference;card.title=item.reference;card.setAttribute('aria-label',item.reference);card.setAttribute('aria-pressed',String(item.reference===current.value));
    const name=document.createElement('span');name.textContent=item.label;const pack=document.createElement('small');pack.textContent=item.pack;card.append(iconPreview(item.reference,34),name,pack);
    card.addEventListener('click',()=>{const choose=current.onChoose;close();choose(item.reference);});grid.append(card);
   }
   grid.setAttribute('aria-busy','false');status.textContent=result.total?`${result.total.toLocaleString()} icons · showing ${result.items.length.toLocaleString()}`:'No matching icons. Try another name or pack.';more.hidden=result.items.length>=result.total;
  }catch(error){if(token!==request||session!==current)return;grid.replaceChildren();grid.setAttribute('aria-busy','false');status.textContent=error.message;const retry=document.createElement('button');retry.textContent='Retry';retry.addEventListener('click',render);grid.append(retry);}
 }
 search.addEventListener('input',()=>{visible=96;grid.scrollTop=0;render();});filter.addEventListener('change',()=>{visible=96;grid.scrollTop=0;render();});more.addEventListener('click',()=>{visible+=96;render();});
 return{
  isOpen:()=>dialog.open,
  open({value,onChoose,returnFocus=document.activeElement}){if(dialog.open)close();session={value,onChoose,returnFocus};visible=96;search.value='';filter.value='';grid.replaceChildren();dialog.showModal();search.focus();render();},
  close
 };
}
