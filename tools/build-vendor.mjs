import {build} from 'esbuild';
import {mkdir,readFile,readdir,writeFile,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
const result=await build({stdin:{contents:"import mermaid from 'mermaid'; window.mermaid=mermaid;",resolveDir:process.cwd()},bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'eof',outfile:'vendor/mermaid.min.js',metafile:true});
const packages=new Map();
for(const name of Object.keys(result.metafile.inputs)) {
 if(!name.includes('node_modules/'))continue;
 let dir=path.dirname(path.resolve(name));
 while(dir!==path.dirname(dir)) {
  try {const meta=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));if(meta.name){packages.set(`${meta.name}@${meta.version}`,{...meta,dir});break;}}catch{}
  dir=path.dirname(dir);
 }
}
await rm('vendor/licenses',{recursive:true,force:true});
await mkdir('vendor/licenses',{recursive:true});
const notices=['# Bundled library licences','', 'Runtime assets are local. Mermaid 12.0.0 includes its ELK layout engine; libavoid-js 0.5.0-beta.5 supplies connection routing.','', 'The Mermaid build uses the pinned packages in package-lock.json. The following licence files correspond to packages contributing code to that bundle:',''];
for(const pkg of [...packages.values()].sort((a,b)=>a.name.localeCompare(b.name))) {
 const files=(await readdir(pkg.dir)).filter(f=>/^(licen[sc]e|copying|notice)([._-]|$)/i.test(f));
 if(!files.length)throw new Error(`Missing licence for ${pkg.name}`);
 const folder=pkg.name.replaceAll('/','_')+'_'+pkg.version;await mkdir(`vendor/licenses/${folder}`,{recursive:true});
 for(const file of files)await copyFile(path.join(pkg.dir,file),`vendor/licenses/${folder}/${file}`);
 notices.push(`- **${pkg.name} ${pkg.version}** — ${pkg.license || 'see licence'}: ${files.map(f=>`[${f}](licenses/${folder}/${f})`).join(', ')}`);
}
notices.push('', '## Icon packs', '', 'Six local Iconify packs and their full licenses are recorded in [icons/README.md](icons/README.md). Rebuild with `npm run build:icons`.', '', '## libavoid routing','', '- **libavoid-js 0.5.0-beta.5 / libavoid** — LGPL-2.1-or-later. [Full licence](libavoid/LICENSE); [source archives and replacement/build instructions](libavoid/SOURCE.md).', '', 'The application calls the separately loaded JavaScript wrapper and WebAssembly module. Neither library is modified. All source archives, attribution, and licence files must accompany redistribution.','', 'The Mermaid bundle also retains upstream embedded notices for DOMPurify, Cytoscape and incorporated MIT components. ELK/elkjs uses EPL-2.0; its source is included under vendor/source.');
await writeFile('vendor/THIRD-PARTY-LICENSES.md',notices.join('\n')+'\n');
await writeFile('vendor/mermaid-build-manifest.json',JSON.stringify({mermaid:'12.0.0',packages:[...packages.values()].map(({name,version,license,repository})=>({name,version,license,repository})),inputs:Object.keys(result.metafile.inputs)},null,2)+'\n');
console.log(`Bundled Mermaid locally; copied licences for ${packages.size} packages.`);
