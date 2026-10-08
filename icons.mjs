import {getIconData,iconToSVG,replaceIDs} from './vendor/icons/iconify-utils.mjs';
import {localIconPack,iconNames,fallbackIcon} from './studio-icons.mjs?v=icons-3';
export {localIconPack,iconNames,fallbackIcon};
export const iconPacks=[
 {prefix:'studio',name:'Studio',palette:false},
 {prefix:'tabler',name:'Tabler',palette:false},
 {prefix:'lucide',name:'Lucide',palette:false},
 {prefix:'carbon',name:'Carbon',palette:false},
 {prefix:'ph',name:'Phosphor',palette:false},
 {prefix:'fluent-color',name:'Fluent Color',palette:true},
 {prefix:'logos',name:'SVG Logos',palette:true}
];
const packs=new Map([['studio',localIconPack]]),pending=new Map(),glyphs=new Map();
const referencePrefix=reference=>typeof reference==='string'?reference.split(':')[0]:'';
export function needsIconPack(reference){const prefix=referencePrefix(reference);return !packs.has(prefix)&&iconPacks.some(p=>p.prefix===prefix);}
export async function loadIconPack(prefix){
 if(packs.has(prefix))return packs.get(prefix);
 if(!iconPacks.some(p=>p.prefix===prefix))return null;
 if(!pending.has(prefix))pending.set(prefix,(async()=>{
  const response=await fetch(new URL(`./vendor/icons/${prefix}.json`,import.meta.url));
  if(!response.ok)throw new Error(`Could not load the bundled ${prefix} icons. Please retry.`);
  const pack=await response.json();if(pack.prefix!==prefix||!pack.icons)throw new Error('Invalid bundled icon pack.');
  packs.set(prefix,pack);return pack;
 })().finally(()=>pending.delete(prefix)));
 return pending.get(prefix);
}
export async function ensureIconPacks(references){await Promise.all([...new Set(references.map(referencePrefix))].map(loadIconPack));}
export const modelIconReferences=model=>model.nodes.filter(n=>n.shape==='icon'||n.container&&n.shape==='person').map(n=>n.icon||'studio:human');
export function iconData(reference){
 if(glyphs.has(reference))return glyphs.get(reference);
 const prefix=referencePrefix(reference),pack=packs.get(prefix),name=typeof reference==='string'?reference.slice(prefix.length+1):'';
 const data=pack&&(Object.hasOwn(pack.icons,name)||Object.hasOwn(pack.aliases||{},name))&&getIconData(pack,name);
 if(!data)return{body:fallbackIcon,viewBox:'0 0 24 24',available:false};
 const svg=iconToSVG(data),result={body:svg.body,viewBox:svg.attributes.viewBox,available:true};glyphs.set(reference,result);return result;
}
export const iconBody=reference=>replaceIDs(iconData(reference).body);
export function iconLabel(reference){return iconNames.find(([id])=>id===reference)?.[1]||String(reference||'').split(':').at(-1).replaceAll('-',' ');}
export function mermaidIconPacks(){return iconPacks.map(p=>p.prefix==='studio'?{name:'studio',icons:localIconPack}:{name:p.prefix,loader:()=>loadIconPack(p.prefix)});}
let catalogPromise;
export async function iconCatalog(){
 catalogPromise||=import('./vendor/icons/catalog.mjs').then(({default:catalog})=>[{prefix:'studio',name:'Studio',count:iconNames.length,names:iconNames.map(([id])=>id.slice(7))},...catalog]);
 return catalogPromise;
}
const normal=value=>value.toLowerCase().replace(/[-_:]+/g,' ').replace(/\s+/g,' ').trim();
const synonyms={human:['human','person','user'],robot:['robot','bot'],agent:['agent','bot','robot'],server:['server','servers']};
const featured={studio:['human','agent','server','database','cloud'],tabler:['user','robot','ai-agent','ai-agents','brain','network','cloud','database','server','shield','api','world'],lucide:['user-round','bot','brain-circuit','network','cloud','database','server','shield-check','workflow'],carbon:['user','bot','ai','ai-agent-invocation','api','data-base','cloud','server'],ph:['user','robot','brain','tree-structure','cloud','database','hard-drives','shield-check'], 'fluent-color':['person-24','agents-24','brain-24','cloud-24','database-24','shield-24','document-24'],logos:['aws','google-cloud','microsoft-azure','openai-icon','github-icon','docker-icon','kubernetes','postgresql','redis','python','javascript']};
export function searchIcons(catalog,query='',prefix='',offset=0,limit=96){
 const tokens=normal(query).split(' ').filter(Boolean),matches=[];
 for(const pack of catalog){if(prefix&&pack.prefix!==prefix)continue;for(const name of pack.names){
  const reference=pack.prefix+':'+name,label=iconLabel(reference),text=normal(reference+' '+label+' '+pack.name);
  if(tokens.every(token=>synonyms[token]?synonyms[token].some(word=>text.split(' ').some(part=>part===word||part===word+'s')):text.includes(token))){
   const needle=normal(query),title=normal(name),score=title===needle?0:title.startsWith(needle)?1:tokens.every(token=>title.split(' ').some(word=>word===token||word===token+'s'))?2:3;
   matches.push({reference,label,pack:iconPacks.find(p=>p.prefix===pack.prefix)?.name||pack.name,score});
  }
 }}
 const favorites=new Map(catalog.flatMap(pack=>(featured[pack.prefix]||[]).map(name=>pack.prefix+':'+name)).map((id,index)=>[id,index]));
 matches.sort((a,b)=>!tokens.length?(favorites.get(a.reference)??1e6)-(favorites.get(b.reference)??1e6)||a.reference.localeCompare(b.reference):a.score-b.score||a.reference.localeCompare(b.reference));
 return{total:matches.length,items:matches.slice(offset,offset+limit)};
}
