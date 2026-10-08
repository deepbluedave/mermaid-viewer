const named={black:'#000000',white:'#ffffff',red:'#ff0000',green:'#008000',blue:'#0000ff',yellow:'#ffff00',orange:'#ffa500',purple:'#800080',grey:'#808080',gray:'#808080',lightgray:'#d3d3d3',lightgrey:'#d3d3d3',pink:'#ffc0cb',cyan:'#00ffff',teal:'#008080',navy:'#000080',silver:'#c0c0c0',brown:'#a52a2a'};
export function colorValue(value){const s=String(value).trim().toLowerCase();if(named[s])return named[s];if(/^#[\da-f]{3}$/.test(s))return'#'+s.slice(1).split('').map(c=>c+c).join('');if(/^#[\da-f]{6}$/.test(s))return s;throw new Error('Supported Mermaid colors are six/three-digit hex or common named colors.');}
export function importStyles(styles,edge=false){
  const result={};for(const item of styles||[])for(const entry of String(item).split(/,(?![^()]*\))/)){if(!entry.trim())continue;const colon=entry.indexOf(':'),key=entry.slice(0,colon).trim(),value=entry.slice(colon+1).trim();
    if(edge&&key==='fill'&&value==='none')continue;
    const field={fill:edge?'labelBackgroundColor':'backgroundColor',color:'fontColor',stroke:edge?'color':'borderColor'}[key];
    if(field){result[field]=colorValue(value);continue;}
    if(key==='stroke-width'){const width=Number(value.replace(/px$/,''));if(!Number.isFinite(width)||width<.5||width>8)throw new Error('Stroke width must be between 0.5 and 8.');result.borderWidth=width;continue;}
    if(key==='stroke-dasharray'){if(value==='0'||value==='none'){if(edge)result.style='normal';else result.borderStyle='solid';}else if(/^[\d\s.]+$/.test(value)){if(edge)result.style='dashed';else result.borderStyle='dashed';}else throw new Error('Unsupported stroke dash pattern.');continue;}
    throw new Error(`Unsupported Mermaid style property: ${key||entry}.`);
  }return result;
}
export function classStyles(item,classes){const values=[];for(const name of item.classes||[]){const def=classes?.get?.(name)||classes?.[name];if(!def)throw new Error(`Style class ${name} is not defined.`);values.push(...def.styles||[],...def.textStyles||[]);}const list=v=>Array.isArray(v)?v:v?[v]:[];return[...values,...list(item.styles),...list(item.style)];}
