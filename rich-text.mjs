// Small, deterministic emphasis parser. Plain text never acquires formatting.
export function parseText(value,format='plain') {
  const source=String(value??'');
  if(format!=='markdown')return{text:source,runs:[{text:source,bold:false,italic:false}]};
  const runs=[];let bold=false,italic=false,buffer='';
  const flush=()=>{if(buffer){runs.push({text:buffer,bold,italic});buffer='';}};
  const hasClosing=(marker,from)=>{
    for(let at=source.indexOf(marker,from);at>=0;at=source.indexOf(marker,at+marker.length)){
      let slashes=0;for(let j=at-1;j>=0&&source[j]==='\\';j--)slashes++;
      if(slashes%2===0&&!(marker[0]==='_'&&/\w/.test(source[at-1]||'')&&/\w/.test(source[at+marker.length]||'')))return true;
    }
    return false;
  };
  for(let i=0;i<source.length;){
    if(source[i]==='\\'&&/[\\*_`]/.test(source[i+1]||'')){buffer+=source[i+1];i+=2;continue;}
    const char=source[i],length=(char==='*'||char==='_')?Math.min(3,source.slice(i).match(new RegExp('^\\'+char+'+'))?.[0].length||0):0;
    if(length&&!(char==='_'&&/\w/.test(source[i-1]||'')&&/\w/.test(source[i+length]||''))){const marker=char.repeat(length),active=length===3?bold&&italic:length===2?bold:italic;
      if(active||hasClosing(marker,i+length)){flush();if(length===3){bold=!bold;italic=!italic;}else if(length===2)bold=!bold;else italic=!italic;i+=length;continue;}
    }
    buffer+=source[i++];
  }
  flush();return{text:runs.map(r=>r.text).join(''),runs};
}
export const rawDisplayText=n=>n.showDescription?n.description||'':n.label||'';
export const formattedText=n=>parseText(rawDisplayText(n),n.textFormat);
export function lineRuns(n,line,start=0){
 const parsed=formattedText(n),result=[];let cursor=start;
 const slice=(from,to)=>{let offset=0;for(const run of parsed.runs){const left=Math.max(from,offset),right=Math.min(to,offset+run.text.length);if(right>left)result.push({...run,text:run.text.slice(left-offset,right-offset)});offset+=run.text.length;}};
 for(const [index,word]of line.split(/\s+/).entries()){if(!word)continue;const found=parsed.text.indexOf(word,cursor),from=found<0?cursor:found;if(index)result.push({text:' ',bold:result.at(-1)?.bold||false,italic:result.at(-1)?.italic||false});slice(from,from+word.length);cursor=from+word.length;}
 return{runs:result.length?result:[{text:line,bold:false,italic:false}],end:cursor};
}
export function validateMarkdown(value){
  if(/<\/?[a-z][^>]*>|!?\[[^\]]*\]\(|(^|\n)\s*(?:#{1,6}\s|[-+]\s|\d+\.\s|>\s)|(^|[^\\])`/.test(value))throw new Error('Markdown supports bold, italic and line breaks only. Remove HTML, links, lists, headings or code.');
}
