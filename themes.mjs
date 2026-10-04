// Theme defaults are resolved at render time. Object overrides stay in the model.
export const themes = Object.freeze([
  {id:'clean', name:'Clean', description:'White and soft grey', node:'#ffffff', zones:['#eef2f6'], nodeText:'#1e293b', zoneText:'#475569', ink:'#64748b', zoneBorder:'#94a3b8', labelBorder:'#e2e8f0'},
  {id:'blueprint', name:'Blueprint', description:'Cool white and muted blue', node:'#f8fbff', zones:['#e0ebf7','#dcecf0','#e7e9f5'], nodeText:'#23374d', zoneText:'#304c68', ink:'#4c6681', zoneBorder:'#859db6', labelBorder:'#ccd9e7'},
  {id:'botanical', name:'Botanical', description:'Warm white, sage and teal', node:'#fffef9', zones:['#e4eddf','#dfeee9','#edeadd'], nodeText:'#293d32', zoneText:'#3c5648', ink:'#526c60', zoneBorder:'#8ba18f', labelBorder:'#d6e0d6'},
  {id:'paper', name:'Paper', description:'Ivory, sand and soft clay', node:'#fffdf7', zones:['#f1e8d8','#efe2dc','#eae8dd'], nodeText:'#493b32', zoneText:'#635044', ink:'#796353', zoneBorder:'#b1a08c', labelBorder:'#e1d6c5'}
].map(theme => Object.freeze({...theme, zones:Object.freeze(theme.zones)})));

export const diagramTheme = model => themes.find(t => t.id === (model.settings.theme ?? 'clean')) || themes[0];
export function zoneThemeColor(theme, id) {
  // Identity, rather than position or array order, makes stage colors stable.
  let hash = 2166136261;
  for (const c of id) hash = Math.imul(hash ^ c.codePointAt(0), 16777619) >>> 0;
  return theme.zones[hash % theme.zones.length];
}
function luminance(hex) {
  return hex.slice(1).match(/../g).map(c => parseInt(c,16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
}
export function contrastRatio(a,b) { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function readableColor(background, preferred, minimum=4.5) {
  if (contrastRatio(background,preferred) >= minimum) return preferred;
  return contrastRatio(background,'#ffffff') > contrastRatio(background,'#000000') ? '#ffffff' : '#000000';
}
