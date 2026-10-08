export const iconNames=[['studio:human','Human'],['studio:agent','Agent'],['studio:server','Server'],['studio:database','Database'],['studio:cloud','Cloud']];
const strokes='fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
export const localIconPack={prefix:'studio',width:24,height:24,icons:{
  human:{body:`<g ${strokes}><circle cx="12" cy="5" r="3"/><path d="M12 8v8m-6-5h12m-6 5-5 6m5-6 5 6"/></g>`},
  agent:{body:`<g ${strokes}><rect x="3" y="6" width="18" height="15" rx="4"/><path d="M12 6V2m-3 0h6M3 11H1m20 0h2M8 17h8"/><circle cx="8" cy="11" r="1"/><circle cx="16" cy="11" r="1"/></g>`},
  server:{body:`<g ${strokes}><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.1M7 17.5h.1M12 6.5h5M12 17.5h5"/></g>`},
  database:{body:`<g ${strokes}><ellipse cx="12" cy="4" rx="9" ry="3"/><path d="M3 4v16c0 4 18 4 18 0V4M3 12c0 4 18 4 18 0"/></g>`},
  cloud:{body:`<path ${strokes} d="M6 19h13a4 4 0 0 0 0-8 7 7 0 0 0-13-3 5.5 5.5 0 0 0 0 11Z"/>`}
}};
export const fallbackIcon='<g fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M9 8c0-4 8-4 7 1-1 3-4 2-4 6m0 3v1"/></g>';
