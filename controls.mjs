import { object, identityText, items, descendants, zonePadding, objectColors, MAX_ZONE_PADDING } from './core.mjs?v=icons-3';
import { attachmentKey } from './attachments.mjs?v=icons-3';
import { MAX_WAYPOINTS } from './waypoints.mjs?v=icons-3';
import {themes,diagramTheme} from './themes.mjs?v=icons-3';
import {svgElement} from './scene.mjs?v=icons-3';

const $ = id => document.getElementById(id);
import {shapeNames,shapeParts,iconBody} from './node-shapes.mjs?v=icons-3';
const sideNames = [['', 'Automatic'], ['north', 'Top'], ['east', 'Right'], ['south', 'Bottom'], ['west', 'Left']];
const alignNames = [['left', 'Left'], ['center-x', 'Horizontal center'], ['right', 'Right'], ['top', 'Top'], ['center-y', 'Vertical center'], ['bottom', 'Bottom']];
const toolNames = [['select', 'Select'], ['pan', 'Pan'], ['node', 'Node'], ['zone', 'Zone'], ['connect', 'Connect']];

// Each surface captures a target, then calls the application's existing operation.
// Menus never infer a canvas point from the position of their DOM element.
export function createEditingControls(api) {
  const rootOverlay = $('editing-overlay'), bar = $('selection-actions'), viewport = $('viewport');
  let overlay=rootOverlay;
  let open = null, barKey = '', touch = null, heldTouch = null, ghostClick = null, blockedClick = false;
  let menuSearch = '', menuSearchTime = 0;
  const narrow = matchMedia('(max-width: 850px)');
  let desktopSourceVisible=!$('source-panel').hidden,desktopInspectorVisible=true;
  const state = () => api.state();
  const modifier=navigator.platform.includes('Mac')?'⌘':'Ctrl+';
  const button = (label, action, id) => {
    const b = document.createElement('button');
    b.textContent = label; b.title = label; if (id) b.id = id;
    b.addEventListener('click', action); return b;
  };
  const targetItem = target => object(state().model, target.id);
  function currentTarget() {
    const {model, selection, activeWaypoint} = state(), ids = [...selection];
    if (ids.length > 1) return {kind: 'multiple', ids};
    if (!ids.length) return {kind: 'canvas', ids: []};
    const n = object(model, ids[0]);
    if (!n) return {kind: 'canvas', ids: []};
    if (activeWaypoint) return {kind: 'waypoint', id: n.id, ids, index: activeWaypoint.index};
    return {kind: model.edges.includes(n) ? 'connection' : model.zones.includes(n) ? 'zone' : 'node', id: n.id, ids};
  }
  function rootCount(target) {
    const m = state().model, selected = items(m).filter(n => target.ids.includes(n.id));
    return selected.filter(n => !selected.some(other => other !== n && descendants(m, other.id).has(n.id))).length;
  }
  function reason(command, target) {
    if (state().busy || state().gesture) return 'Wait for the current operation to finish';
    const n = targetItem(target);
    if(command==='copy'&&!target.ids.length)return 'Select diagram objects to copy';
    if(command==='undo'&&!state().history.past.length&&!state().pendingUndo)return 'There are no edits to undo';
    if(command==='redo'&&!state().history.future.length)return 'There are no edits to redo';
    if (command === 'align' && rootCount(target) < 2) return 'Select at least two separate nodes or zones';
    if (command === 'distribute' && rootCount(target) < 3) return 'Select at least three separate nodes or zones';
    if (command === 'reset-route' && !n?.waypoints?.length) return 'This connection has no manual waypoints';
    if (command === 'reset-label' && !n?.labelPosition) return 'This label has automatic placement';
    if (command === 'waypoint' && (n?.waypoints?.length || 0) >= MAX_WAYPOINTS) return `A connection can have at most ${MAX_WAYPOINTS} waypoints`;
    return '';
  }
  function available(b, command, target) {
    const why = reason(command, target); b.disabled = Boolean(why);
    b.title = why || b.getAttribute('aria-label') || b.textContent; b.setAttribute('aria-disabled', String(Boolean(why)));
    if (why) b.setAttribute('aria-description', why); else b.removeAttribute('aria-description');
  }
  function hasZones(target) { return target.ids.some(id => state().model.zones.some(z => z.id === id)); }
  function objectDefinitions(target) {
    const n = targetItem(target), row = (command, label) => ({command, label,submenu:['shape','style','arrows','align','distribute'].includes(command)});
    switch (target.kind) {
      case 'node': return [row('label', 'Edit label'), row('shape', 'Shape'), row('color', 'Color'), row('connect', 'Connect from here'), row('fit-label', 'Fit to label'), {command:'show-description',label:'Show description',checked:Boolean(n?.showDescription)}, ...(n?.container?[row('collapse',n.collapsed?'Expand container':'Collapse container')]:[]), row('container', n?.container ? 'Disable container' : 'Enable container'), row('details', 'Details'), row('delete', 'Delete node')];
      case 'connection': return [row('label', 'Edit label'), row('style', 'Line style'), row('arrows', 'Arrows'), row('waypoint', target.point ? 'Add waypoint here' : 'Add waypoint'), row('attachments', 'Attachments'), row('reset-label', 'Reset label position'), row('reset-route', 'Reset route'), row('details', 'Details'), row('delete', 'Delete connection')];
      case 'label': return [row('label', 'Edit label'), row('reset-label', 'Reset label position'), row('connection-actions', 'Connection actions')];
      case 'waypoint': return [row('remove-waypoint', 'Remove waypoint'), row('connection-actions', 'Connection actions')];
      case 'zone': return [row('label', 'Edit label'),{command:'show-description',label:'Show description',checked:Boolean(n?.showDescription)}, row('collapse',n?.collapsed?'Expand zone':'Collapse zone'),row('fit-zone', 'Fit to contents'), row('padding', 'Padding'), row('color', 'Color'), row('details', 'Details'), row('delete', 'Delete zone')];
      case 'multiple': return [row('align', 'Align'), row('distribute', 'Distribute'), ...(hasZones(target) ? [row('fit-zone', 'Fit selected zones')] : []), row('details', 'Details'), row('delete', 'Delete selection')];
      default: return [row('node', target.point ? 'Add node here' : 'Add node'), row('zone', target.point ? 'Add zone here' : 'Add zone'), row('fit-diagram', 'Fit diagram')];
    }
  }
  function definitions(target){
    const entries=objectDefinitions(target);
    const clipboard=[];if(target.ids.length)clipboard.push({command:'copy',label:'Copy',shortcut:modifier+'C',separated:true});
    clipboard.push({command:target.point?'paste-here':'paste',label:target.point?'Paste here':'Paste',shortcut:modifier+'V',separated:!target.ids.length});
    const index=entries.findIndex(e=>['details','delete'].includes(e.command));entries.splice(index<0?entries.length:index,0,...clipboard);
    return entries;
  }
  function barActions(target) {
    const n=targetItem(target);
    const row = (command, label) => ({command, label});
    switch (target.kind) {
      case 'node': return [row('shape', 'Shape'), row('color', 'Color'), row('connect', 'Connect'), row('fit-label', 'Fit to label')];
      case 'connection': return [row('style', 'Line style'), row('arrows', 'Arrows'), row('waypoint', 'Add waypoint'), row('attachments', 'Attachments')];
      case 'zone': return [row('collapse',n?.collapsed?'Expand zone':'Collapse zone'),row('fit-zone', 'Fit to contents'), row('padding', 'Padding'), row('color', 'Color')];
      case 'multiple': return [row('align', 'Align'), row('distribute', 'Distribute'), ...(hasZones(target) ? [row('fit-zone', 'Fit zones')] : [])];
      case 'waypoint': return [row('remove-waypoint', 'Remove waypoint'), row('connection-actions', 'Connection actions')];
      default: return [];
    }
  }
  function dismiss(restore = true) {
    const old = open;
    for(let panel=open;panel;panel=panel.parentMenu){panel.invoker?.setAttribute('aria-expanded','false');if(panel.element!==rootOverlay)panel.element?.remove();}
    open=null;overlay=rootOverlay;overlay.hidden=true;overlay.replaceChildren();
    if(restore&&old)(old.invoker?.isConnected?old.invoker:viewport).focus({preventScroll:true});
  }
  function inMenus(target){for(let panel=open;panel;panel=panel.parentMenu)if(panel.element?.contains(target)||panel.invoker?.contains(target))return true;return false;}
  function position() {
    if (!open) return;
    if(open.parentMenu){const active=open,panel=overlay;open=active.parentMenu;overlay=open.element;position();open=active;overlay=panel;}
    let {x, y} = open.anchor;
    if(open.parentMenu?.element&&open.invoker?.isConnected){const row=open.invoker.getBoundingClientRect(),parent=open.parentMenu.element.getBoundingClientRect();x=parent.right+4;y=row.top;const width=window.visualViewport?.width||innerWidth;if(x+overlay.offsetWidth>width-8)x=parent.left-overlay.offsetWidth-4;if(narrow.matches){x=parent.left+16;y=row.bottom+4;}}
    if (open.type === 'attachment') {
      const path = state().routes.get(open.target.id), p = open.target.end === 'source' ? path?.[0] : path?.at(-1);
      if (p) {
        const v = state().model.settings.view, b = viewport.getBoundingClientRect(), side = attachmentGroup(open.target)?.side;
        const px = b.left + v.x + p.x * v.scale, py = b.top + v.y + p.y * v.scale;
        x = side === 'west' ? px - overlay.offsetWidth - 14 : side === 'east' ? px + 14 : px - overlay.offsetWidth / 2;
        y = side === 'north' ? py - overlay.offsetHeight - 14 : side === 'south' ? py + 14 : py - 20;
      }
    } else if (!open.parentMenu && open.invoker?.isConnected && open.anchor.element) {
      const b = open.invoker.getBoundingClientRect(); x = b.left; y = b.bottom + 6;
    }
    const visual = window.visualViewport, left = visual?.offsetLeft || 0, top = visual?.offsetTop || 0;
    const width = visual?.width || innerWidth, height = visual?.height || innerHeight;
    overlay.style.maxHeight = `${Math.max(100, height - 16)}px`;
    overlay.style.left = `${Math.max(left + 8, Math.min(x, left + width - overlay.offsetWidth - 8))}px`;
    overlay.style.top = `${Math.max(top + 8, Math.min(y, top + height - overlay.offsetHeight - 8))}px`;
  }
  function show(type, target, anchor, invoker, title) {
    dismiss(false); open = {type, target, anchor, invoker,element:overlay}; overlay.hidden = false;
    overlay.className = `editing-overlay ${type}-popover`; overlay.setAttribute('role', type === 'menu' ? 'menu' : 'dialog');
    overlay.setAttribute('aria-label', title); if (invoker) invoker.setAttribute('aria-expanded', 'true');
    if (type !== 'menu') {const h = document.createElement('h2'); h.textContent = title; overlay.append(h);}
  }
  function anchorFor(invoker) { const b = invoker.getBoundingClientRect(); return {x: b.left, y: b.bottom + 6, element: true}; }
  function menu(target, anchor, invoker, entries = definitions(target), title = 'Actions',parentMenu=null) {
    if (!beforeAction()) return;
    if(parentMenu?.element){overlay=document.createElement('div');overlay.className='editing-overlay menu-popover menu-flyout';overlay.setAttribute('role','menu');overlay.setAttribute('aria-label',title);overlay.id='editing-flyout';document.body.append(overlay);open={type:'menu',target,anchor,invoker,element:overlay};invoker?.setAttribute('aria-expanded','true');}
    else show('menu', target, anchor, invoker, title);
    open.entries=entries;open.title=title;open.parentMenu=parentMenu;menuSearch='';
    for (const entry of entries) {
      const b = button('', () => {while(open?.parentMenu&&open.element!==host)backMenu(false);activate(entry.command,target,anchor,entry.submenu?b:invoker,entry.value);});
      const host=overlay;
      if(entry.command==='set-shape')b.append(shapePreview(entry.value));
      const label=document.createElement('span');label.className='menu-label';label.textContent=entry.label;b.append(label);b.setAttribute('aria-label',entry.label);
      if(entry.shortcut){const shortcut=document.createElement('span');shortcut.className='menu-shortcut';shortcut.textContent=entry.shortcut;shortcut.setAttribute('aria-hidden','true');b.append(shortcut);}
      if(entry.submenu){const chevron=document.createElement('span');chevron.className='menu-chevron';chevron.textContent='›';chevron.setAttribute('aria-hidden','true');b.append(chevron);b.setAttribute('aria-haspopup','menu');}
      b.dataset.command = entry.command; b.setAttribute('role', entry.selected ? 'menuitemradio' : 'menuitem');
      if (entry.selected !== undefined) { b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(entry.selected)); }
      if (entry.checked !== undefined) {b.setAttribute('role','menuitemcheckbox');b.setAttribute('aria-checked',String(entry.checked));}
      if (entry.command === 'delete') b.classList.add('danger');
      if (entry.separated || ['details', 'delete'].includes(entry.command)) b.classList.add('menu-separated');
      available(b, entry.command, target); overlay.append(b);
      if(entry.submenu)b.addEventListener('pointerenter',()=>{if(narrow.matches)return;if(open?.invoker===b)return;while(open?.parentMenu&&open.element!==host)backMenu(false);activate(entry.command,target,anchor,b,entry.value);});
    }
    position(); overlay.querySelector('button:not(:disabled)')?.focus({preventScroll: true});
  }
  function shapePreview(shape){
    const svg=svgElement('svg',{class:'menu-shape-preview',viewBox:'0 0 32 24','aria-hidden':'true'});
    const n={shape:['human','agent'].includes(shape)?'icon':shape,width:28,height:20,iconForm:'none',iconSize:18};
    const g=svgElement('g',{transform:'translate(2,2)'});for(const p of shapeParts(n))g.append(svgElement(p.tag,p.attrs));
    if(n.shape==='icon'){const icon=svgElement('g',{transform:'translate(5,0) scale(.8)',style:'color:currentColor'});icon.innerHTML=iconBody(shape==='agent'?'studio:agent':'studio:human');g.append(icon);}svg.append(g);return svg;
  }
  function parentMenu(command){if(open?.type!=='menu')return null;open.focusCommand=command;return open;}
  function backMenu(focus=true){const parent=open?.parentMenu;if(!parent)return false;open.invoker?.setAttribute('aria-expanded','false');overlay.remove();open=parent;overlay=parent.element;if(focus)overlay.querySelector(`[data-command="${parent.focusCommand}"]`)?.focus({preventScroll:true});return true;}
  function choices(command, values, selected, target, anchor, invoker, title) {
    const parent=parentMenu(command==='arrange'&&title==='Distribute'?'distribute':{ 'set-flow':'flow','set-layout':'layout','set-shape':'shape','set-style':'style','set-arrows':'arrows',arrange:'align'}[command]);
    menu(target, anchor, invoker, values.map(([value, label]) => ({command, value, label, selected: value === selected})), title,parent);
  }
  function activate(command, target, anchor, invoker, value) {
    if (reason(command, target) || !beforeAction()) return;
    const n = targetItem(target);
    if (command === 'shape') return choices('set-shape', shapeNames, n.shape, target, anchor, invoker, 'Shape');
    if (command === 'style') return choices('set-style', [['normal', 'Normal'], ['dashed', 'Dashed'], ['thick', 'Thick']], n.style, target, anchor, invoker, 'Line style');
    if (command === 'arrows') return choices('set-arrows', [['forward', 'One arrow'], ['none', 'No arrows'], ['both', 'Two arrows']], n.direction, target, anchor, invoker, 'Arrows');
    if (command === 'align') return choices('arrange', alignNames, '', target, anchor, invoker, 'Align');
    if (command === 'distribute') return choices('arrange', [['distribute-x', 'Across'], ['distribute-y', 'Down']], '', target, anchor, invoker, 'Distribute');
    if (['label', 'padding', 'color', 'font'].includes(command)) return edit(command, target, anchor, invoker);
    if (command === 'attachments') return attachments({...target, end: target.end || 'source'}, anchor, invoker);
    if (command === 'connection-actions') return menu({...target, kind: 'connection'}, anchor, invoker);
    if (command === 'flow') return choices('set-flow', ['TD', 'LR', 'BT', 'RL'].map(v => [v, {TD:'Top to bottom', LR:'Left to right', BT:'Bottom to top', RL:'Right to left'}[v]]), state().model.settings.direction, target, anchor, invoker, 'Flow direction');
    if (command === 'layout') return choices('set-layout', [['adaptive', 'Adaptive'], ['hierarchical', 'Hierarchical']], state().model.settings.layout, target, anchor, invoker, 'Layout style');
    if (command === 'theme') return themePicker(target,anchor,invoker);
    if (command === 'export') return menu(target,anchor,invoker,[{command:'export-svg',label:'SVG image'},{command:'export-png',label:'PNG image'},{command:'export-mermaid',label:'Mermaid source'},{command:'export-mermaid-portable',label:'Portable Mermaid'}],'Export',parentMenu('export'));
    dismiss(false); api.execute(command, target, value);
    if (command === 'details') {
      const panel = document.querySelector('.properties-panel'); panel.hidden=false;panel.classList.add('is-open');document.body.classList.remove('inspector-hidden');
      $('btn-mobile-properties').setAttribute('aria-expanded','true');sizeBar();(narrow.matches ? $('btn-close-properties') : panel.querySelector('#property-label,.arrange-buttons button'))?.focus({preventScroll:true});
    } else if (!['connect', 'node', 'zone', 'waypoint', 'open', 'source', 'hierarchy'].includes(command)) (invoker?.isConnected ? invoker : viewport).focus({preventScroll: true});
  }
  function themePicker(target,anchor,invoker){
    show('theme',target,anchor,invoker,'Diagram theme');
    const hint=document.createElement('p');hint.className='small-note';hint.textContent='Set default colors. Custom colors stay in place.';overlay.append(hint);
    const cards=document.createElement('div');cards.className='theme-cards';cards.setAttribute('role','group');cards.setAttribute('aria-label','Themes');
    for(const theme of themes){
      const card=button('',()=>api.execute('set-theme',target,theme.id));card.className='theme-card';card.dataset.theme=theme.id;card.setAttribute('aria-label',`${theme.name} · ${theme.description}`);
      const preview=svgElement('svg',{viewBox:'0 0 220 86','aria-hidden':'true','font-family':'system-ui, sans-serif','font-weight':400});
      preview.append(svgElement('rect',{width:220,height:86,fill:'#f8fafc',rx:5}));
      for(let i=0;i<3;i++){
        const x=8+i*70,bg=theme.zones[i%theme.zones.length];
        preview.append(svgElement('rect',{x,y:9,width:64,height:68,rx:3,fill:bg,stroke:theme.zoneBorder,'stroke-dasharray':'2 2'}),svgElement('text',{x:x+32,y:24,fill:theme.zoneText,'font-size':9,'text-anchor':'middle'},['Plan','Build','Check'][i]));
        if(i)preview.append(svgElement('path',{d:`M${x-18},51 H${x+9} m-4,-3 l4,3 -4,3`,stroke:theme.ink,fill:'none','stroke-width':1.5}));
        preview.append(svgElement('rect',{x:x+11,y:36,width:42,height:30,rx:i===1?8:3,fill:theme.node,stroke:theme.ink}),svgElement('text',{x:x+32,y:54,fill:theme.nodeText,'font-size':9,'text-anchor':'middle'},['Idea','Make','Test'][i]));
      }
      const name=document.createElement('strong');name.textContent=theme.name;const description=document.createElement('span');description.textContent=theme.description;card.append(preview,name,description);cards.append(card);
    }
    overlay.append(cards,button('Close',()=>dismiss(),'btn-theme-close'));renderTheme();position();overlay.querySelector(`[data-theme="${diagramTheme(state().model).id}"]`).focus({preventScroll:true});
  }
  function renderTheme(){if(open?.type==='theme')for(const card of overlay.querySelectorAll('[data-theme]')){card.setAttribute('aria-pressed',String(card.dataset.theme===diagramTheme(state().model).id));card.disabled=state().busy||Boolean(state().gesture);}}
  function edit(command, target, anchor, invoker) {
    api.beginDraft(command, target); show('edit', target, anchor, invoker, {label:'Edit label', padding:'Padding', color:'Color', font:'Text size'}[command]);
    open.command = command; open.fields = new Map(); open.colorEdits=new Map();
    const n = targetItem(target), values = command === 'padding' ? zonePadding(n) : command === 'color' ? objectColors(state().model, n) : null;
    function input(key, caption, value, type = 'text') {
      const wrap = document.createElement('div'); wrap.className = 'property-field';
      const label = document.createElement('label'), control = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      control.id = `edit-${key}`; if (type !== 'textarea') control.type = type; else control.rows = 3;
      control.value = value; label.htmlFor = control.id; label.textContent = caption; wrap.append(label, control); overlay.append(wrap); open.fields.set(key, control);
      control.addEventListener('input', () => {if(command==='color')open.colorEdits.set(key,'custom');validateDraft();}); return control;
    }
    if (command === 'label') input('label', 'Label', n.label || '', 'textarea');
    if (command === 'font') { const c = input('fontSize', 'Text size (px)', state().model.settings.fontSize || 13, 'number'); c.min = 10; c.max = 48; c.step = 1; }
    if (command === 'padding') {
      overlay.classList.add('padding-popover');
      for (const [side, caption] of [['top', 'Below title'], ['right', 'Right'], ['bottom', 'Bottom'], ['left', 'Left']]) {
        const c = input(`padding-${side}`, `${caption} (diagram units)`, values[side], 'number'); c.min = 0; c.max = MAX_ZONE_PADDING; c.step = 'any';
      }
      const hint = document.createElement('p'); hint.className = 'small-note'; hint.textContent = 'Padding can grow the frame. Use Fit to contents to shrink it.'; overlay.append(hint);
    }
    if (command === 'color') for (const [key, caption, value] of [['backgroundColor', 'Background color', values.background], ['fontColor', 'Text color', values.font]]) {
      const c = input(key, caption, value); c.maxLength = 7; c.spellcheck = false; c.parentElement.classList.add('color-field');
      const picker = document.createElement('input'); picker.type = 'color'; picker.value = value; picker.setAttribute('aria-label', `${caption} picker`); c.parentElement.append(picker);
      picker.addEventListener('input', () => { c.value = picker.value;open.colorEdits.set(key,'custom'); validateDraft(); });
      c.addEventListener('input', () => { if (/^#[\da-f]{6}$/i.test(c.value.trim())) picker.value = c.value.trim(); });
      const origin=document.createElement('div');origin.className='color-inheritance';const badge=document.createElement('span');badge.className='color-origin';const reset=button('Reset to theme',()=>{open.colorEdits.set(key,null);if(validateDraft())c.focus({preventScroll:true});});reset.dataset.resetColor=key;reset.setAttribute('aria-label',`Reset ${caption.toLowerCase()} to theme`);origin.append(badge,reset);c.parentElement.append(origin);
    }
    const error = document.createElement('p'); error.id = 'edit-error'; error.className = 'edit-error'; error.setAttribute('role', 'alert'); error.hidden = true; overlay.append(error);
    const actions = document.createElement('div'); actions.className = 'popover-actions';
    const apply = button('Apply', () => beforeAction(true), 'btn-edit-apply'); apply.className = 'primary';
    actions.append(button('Cancel', cancelEdit, 'btn-edit-cancel'), apply); overlay.append(actions);
    refreshColorDraft();position(); const first = open.fields.values().next().value; first.focus({preventScroll: true}); if (command === 'label') first.select();
  }
  function refreshColorDraft(){
    if(open?.command!=='color')return;
    const n=targetItem(open.target),colors=objectColors(state().model,n);
    for(const [key,c]of open.fields){
      const custom=n[key]!==undefined,row=c.parentElement;
      row.querySelector('.color-origin').textContent=custom?'Custom':'Theme';row.querySelector('[data-reset-color]').disabled=!custom;
      if(!custom&&open.colorEdits.get(key)!=='custom'){c.value=key==='backgroundColor'?colors.background:colors.font;row.querySelector('[type=color]').value=c.value;}
    }
  }
  function validateDraft() {
    if (open?.type !== 'edit') return true;
    const values = open.command==='color'?Object.fromEntries([...open.colorEdits].map(([key,value])=>[key,value===null?null:open.fields.get(key).value])):Object.fromEntries([...open.fields].map(([key, control]) => [key, control.value]));
    const result = api.previewDraft(values), message = $('edit-error');
    message.hidden = !result.error; message.textContent = result.error || '';
    for (const [key, control] of open.fields) { control.setAttribute('aria-invalid', String(key === result.field)); control.setAttribute('aria-describedby', 'edit-error'); }
    open.invalid = result.field;if(!result.error)refreshColorDraft(); return !result.error;
  }
  function beforeAction(restore = false) {
    if (open?.type !== 'edit') return true;
    if (!validateDraft()) {open.fields.get(open.invalid)?.focus({preventScroll: true}); return false;}
    api.finishDraft(); dismiss(restore); return true;
  }
  function cancelEdit() { if (open?.type === 'edit') api.cancelDraft(); dismiss(); }
  function attachmentGroup(target) {
    const key = attachmentKey(target.id, target.end);
    return [...state().groups.values()].find(g => g.entries.some(e => e.key === key));
  }
  function attachments(target, anchor, invoker) {
    if (!beforeAction()) return;
    show('attachment', target, anchor, invoker, 'Attachment');
    const tabs = document.createElement('div'); tabs.className = 'attachment-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Connection end');
    for (const end of ['source', 'target']) { const b = button(end === 'source' ? 'Source' : 'Target', () => {open.target.end = end; open.endpoint = null; renderAttachment();}); b.dataset.end = end; tabs.append(b); } overlay.append(tabs);
    const summary = document.createElement('p'); summary.className = 'attachment-summary'; overlay.append(summary);
    const wrap = document.createElement('div'); wrap.className = 'property-field'; const caption = document.createElement('label'); caption.htmlFor = 'attachment-side'; caption.textContent = 'Side';
    const select = document.createElement('select'); select.id = 'attachment-side'; for (const [value, label] of sideNames) select.add(new Option(label, value)); wrap.append(caption, select); overlay.append(wrap);
    select.addEventListener('change', () => api.execute('set-side', open.target, select.value));
    const row = document.createElement('div'); row.className = 'attachment-order-buttons';
    for (const delta of [-1, 1]) { const b = button('', () => api.execute('order', open.target, delta), delta === -1 ? 'attachment-earlier' : 'attachment-later'); row.append(b); } overlay.append(row);
    overlay.append(button('Reset side order', () => api.execute('reset-side-order', open.target), 'attachment-reset'));
    const hint = document.createElement('p'); hint.className = 'small-note'; hint.textContent = 'Reset applies to all attachments on this side. Spacing stays automatic.'; overlay.append(hint);
    overlay.append(button('Close', () => dismiss(), 'attachment-close')); renderAttachment(); select.focus({preventScroll: true});
  }
  function renderAttachment() {
    if (open?.type !== 'attachment') return;
    const {target} = open, group = attachmentGroup(target), e = targetItem(target);
    if (!e || !state().selection.has(e.id) || !group || (open.endpoint && open.endpoint !== e[target.end])) {dismiss(); return;}
    open.endpoint = e[target.end];
    const key = attachmentKey(e.id, target.end), index = group.entries.findIndex(entry => entry.key === key), horizontal = ['north', 'south'].includes(group.side);
    overlay.querySelector('h2').textContent = `${target.end === 'source' ? 'Source' : 'Target'} · ${identityText(group.n)||group.n.id}`;
    for (const b of overlay.querySelectorAll('.attachment-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.end === target.end));
    overlay.querySelector('.attachment-summary').textContent = `${sideNames.find(([side]) => side === group.side)?.[1]} side · ${index + 1} of ${group.entries.length} · ${group.manual ? 'Manual order' : 'Automatic order'}`;
    const projected=group.n.id!==e[target.end];$('attachment-side').disabled=projected;
    if(projected)overlay.querySelector('.attachment-summary').textContent='Expand this container to edit its hidden node’s attachment.';
    $('attachment-side').value = e[target.end + 'Side'] || '';
    for (const [id, label, limit, why] of [['attachment-earlier', horizontal ? 'Move left' : 'Move up', index === 0, 'Already first'], ['attachment-later', horizontal ? 'Move right' : 'Move down', index === group.entries.length - 1, 'Already last']]) {
      const b = $(id); b.textContent = label; b.disabled = projected || state().busy || Boolean(state().gesture) || limit; b.title = limit ? why : label;
    }
    $('attachment-reset').disabled = projected || state().busy || Boolean(state().gesture) || !group.manual;
    $('attachment-reset').title = group.manual ? 'Applies to all attachments on this side' : 'This side has automatic order'; position();
  }
  function render() {
    $('btn-theme').textContent=`Theme · ${diagramTheme(state().model).name}`;renderTheme();
    const target = currentTarget(), n = targetItem(target), actions = barActions(target), key = JSON.stringify([target.kind, target.ids, target.index, hasZones(target)]);
    const name = target.kind === 'multiple' ? `${target.ids.length} objects selected` : target.kind === 'canvas' ? 'Select an object to edit it' : target.kind === 'waypoint' ? `Waypoint ${target.index + 1} · ${(n?identityText(n):'Connection')}` : `${{node:'Node', connection:'Connection', zone:'Zone'}[target.kind]} · ${(n?identityText(n)||n.id:'')}`;
    $('selection-name').textContent = name; $('selection-name').title = name; $('selection-name').setAttribute('aria-label', name);
    $('selection-bar').hidden=target.kind==='canvas';
    if (key !== barKey) {
      barKey = key; bar.replaceChildren();
      const compact={'fit-label':'Fit',style:'Line',waypoint:'+ Point',attachments:'Ends','fit-zone':'Fit'};
      for (const {command, label} of actions) {const b = button(compact[command]||label, () => {if(open?.invoker===b){if(open.type==='edit')beforeAction(true);else dismiss();return;}activate(command, currentTarget(), anchorFor(b), b);}, `selection-${command}`);b.setAttribute('aria-label',label);b.title=label; b.dataset.command = command; const popup = ['color','attachments','padding'].includes(command) ? 'dialog' : ['shape','style','arrows','align','distribute','connection-actions'].includes(command) ? 'menu' : null; if(popup){b.setAttribute('aria-haspopup',popup);b.setAttribute('aria-expanded','false');} bar.append(b);}
    }
    for (const b of bar.children) available(b, b.dataset.command, target);
    $('btn-selection-more').disabled = state().busy || Boolean(state().gesture);
    $('btn-tool-menu').textContent = `${toolNames.find(([key]) => key === state().tool)?.[1] || 'Place waypoint'} ▾`;
    for (const id of ['btn-tool-menu', 'btn-project-menu','btn-edit-menu','btn-view-menu', 'btn-diagram-menu','btn-mobile-selection','btn-mobile-properties']) $(id).disabled = state().busy || Boolean(state().gesture);
    const panel=document.querySelector('.properties-panel'),visible=!panel.hidden&&(!narrow.matches||panel.classList.contains('is-open'));
    $('btn-mobile-properties').setAttribute('aria-expanded',String(visible));
    document.body.classList.toggle('inspector-hidden',!narrow.matches&&panel.hidden);
    if (open?.type === 'attachment') renderAttachment();
    if (open?.type === 'menu') for (const b of overlay.querySelectorAll('[data-command]')) available(b, b.dataset.command, open.target);
    sizeBar();
  }
  function sizeBar() {
    for (const b of bar.children) b.hidden = false;
    const room = $('selection-bar').clientWidth - $('btn-selection-more').offsetWidth - 4;
    if(room<=0)return;
    let used = 0;
    for (const b of bar.children) {used+=b.offsetWidth+4;b.hidden=used>room;}
  }
  function contextTarget(event) {
    const el = event.target, part = el.closest('[data-reconnect],[data-waypoint],.edge-label'), hit = el.closest('[data-object-id]');
    const id = part?.dataset.reconnect || part?.dataset.waypoint || hit?.dataset.objectId;
    const point = api.diagramPoint(event);
    if (!id || !object(state().model, id)) return {kind: 'canvas', ids: [], point};
    if (!state().selection.has(id)) api.select(id);
    let target = currentTarget();
    if (target.ids.length === 1 && part) {
      if (part.dataset.reconnect) {api.select(id);target = {...currentTarget(), kind: 'attachment', end: part.dataset.end};}
      else if (part.dataset.waypoint) { api.activateWaypoint(id, Number(part.dataset.waypointIndex)); target = currentTarget(); }
      else {api.activateLabel(id);target = {...currentTarget(), kind: 'label'};}
    }
    return {...target, point};
  }
  function context(event) {
    if (state().busy || !beforeAction()) return;
    api.cancelGesture(); const target = contextTarget(event), anchor = {x: event.clientX, y: event.clientY};
    if (target.kind === 'attachment') attachments(target, anchor, null); else menu(target, anchor, null);
  }
  $('btn-selection-more').addEventListener('click', event => toggleMenu(event.currentTarget,()=>menu(currentTarget(), anchorFor(event.currentTarget), event.currentTarget)));
  $('btn-mobile-selection').addEventListener('click', event => toggleMenu(event.currentTarget,()=>menu(currentTarget(),anchorFor(event.currentTarget),event.currentTarget)));
  $('btn-mobile-properties').addEventListener('click',event=>{if(!beforeAction())return;api.execute('toggle-properties',currentTarget());const panel=document.querySelector('.properties-panel');if(!panel.hidden&&(!narrow.matches||panel.classList.contains('is-open')))(narrow.matches?$('btn-close-properties'):panel.querySelector('#property-label')||panel)?.focus({preventScroll:true});});
  $('btn-tool-menu').addEventListener('click', event => toggleMenu(event.currentTarget,()=>menu({kind:'global', ids:[]}, anchorFor(event.currentTarget), event.currentTarget, toolNames.map(([value, label]) => ({command:'tool', value, label, selected: value === state().tool})), 'Tools')));
  const globals={
    'btn-project-menu':()=>[{command:'new',label:'New diagram'},{command:'open',label:'Open…'},{command:'recent',label:'Recent files…'},{command:'save',label:'Save project',shortcut:modifier+'S'},{command:'save-as',label:'Save as…'},{command:'download-copy',label:'Download a copy'},{command:'autosave',label:'Autosave',checked:state().files.autosave,separated:true},...(state().files.hasRecovery?[{command:'recovery',label:'Browser recovery…'}]:[]),{command:'export',label:'Export',submenu:true,separated:true}],
    'btn-edit-menu':()=>[{command:'undo',label:'Undo',shortcut:modifier+'Z'},{command:'redo',label:'Redo',shortcut:modifier+'Shift+Z'},{command:'copy',label:'Copy',shortcut:modifier+'C',separated:true},{command:'paste',label:'Paste',shortcut:modifier+'V'}],
    'btn-view-menu':()=>[{command:'hierarchy',label:'Hierarchy',checked:!$('source-panel').hidden&&!$('hierarchy-content').hidden},{command:'source',label:'Mermaid source',checked:!$('source-panel').hidden&&!$('source-content').hidden},{command:'toggle-properties',label:'Properties',checked:!document.querySelector('.properties-panel').hidden&&(!narrow.matches||document.querySelector('.properties-panel').classList.contains('is-open'))},{command:'fit-diagram',label:'Fit diagram',separated:true}],
    'btn-diagram-menu':()=>[{command:'theme',label:`Theme · ${diagramTheme(state().model).name}`},{command:'flow',label:'Flow direction',submenu:true,separated:true},{command:'layout',label:'Layout style',submenu:true},{command:'auto-layout',label:'Auto layout'},{command:'font',label:'Text size',separated:true}]
  };
  function rootMenu(){let panel=open;while(panel?.parentMenu)panel=panel.parentMenu;return panel;}
  function toggleMenu(invoker,show){if(rootMenu()?.invoker===invoker&&open.type==='menu'){dismiss();return;}show();}
  function globalMenu(invoker){invoker.focus({preventScroll:true});menu(invoker.id==='btn-edit-menu'?currentTarget():{kind:'global',ids:[]},anchorFor(invoker),invoker,globals[invoker.id](),invoker.textContent);}
  for(const id of Object.keys(globals)){
    const invoker=$(id);invoker.addEventListener('click',()=>toggleMenu(invoker,()=>globalMenu(invoker)));
    invoker.tabIndex=id==='btn-project-menu'?0:-1;invoker.addEventListener('focus',()=>{for(const other of Object.keys(globals))$(other).tabIndex=other===id?0:-1;});
    invoker.addEventListener('pointerenter',()=>{if(!narrow.matches&&open?.type==='menu'&&rootMenu()?.invoker?.closest('.app-menus')&&rootMenu().invoker!==invoker)globalMenu(invoker);});
    invoker.addEventListener('keydown',event=>{
      if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopPropagation();const buttons=[...document.querySelectorAll('.app-menus>button')],i=buttons.indexOf(invoker);buttons[(i+(event.key==='ArrowRight'?1:buttons.length-1))%buttons.length].focus();}
      if(event.key==='ArrowDown'){event.preventDefault();event.stopPropagation();globalMenu(invoker);}
    });
  }
  $('btn-theme').addEventListener('click',event=>activate('theme',{kind:'global',ids:[]},anchorFor(event.currentTarget),event.currentTarget));
  function closeProperties(){api.flushProperties();document.querySelector('.properties-panel').classList.remove('is-open');$('btn-mobile-properties').setAttribute('aria-expanded','false');$('btn-mobile-properties').focus();}
  $('btn-close-properties').addEventListener('click',closeProperties);
  viewport.addEventListener('contextmenu', event => { if (event.target.closest('.zoom-toolbar')) return; event.preventDefault(); context(event); });
  document.addEventListener('pointerdown', event => {
    blockedClick = false;
    if (!open || inMenus(event.target)) return;
    if (!beforeAction()) {blockedClick = true; event.preventDefault(); event.stopImmediatePropagation(); return;}
    dismiss(false);
  }, true);
  document.addEventListener('click', event => {if(blockedClick){blockedClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown', event => {
    if(!open&&narrow.matches&&event.key==='Escape'&&document.querySelector('.properties-panel').classList.contains('is-open')){event.preventDefault();event.stopImmediatePropagation();closeProperties();return;}
    if (open) {
      if (event.key === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); if (open.type === 'edit') cancelEdit(); else if(open.type!=='menu'||!backMenu())dismiss(); return;}
      if (overlay.contains(event.target)) {
        // Menu navigation must never reach the canvas's nudge/tool shortcuts.
        event.stopPropagation();
        if(open.type==='menu'&&event.key==='ArrowLeft'&&open.parentMenu){event.preventDefault();backMenu();return;}
        if(open.type==='menu'&&event.key==='ArrowRight'&&event.target.getAttribute('aria-haspopup')==='menu'){event.preventDefault();event.target.click();return;}
        if(open.type==='menu'&&['ArrowLeft','ArrowRight'].includes(event.key)&&rootMenu()?.invoker?.closest('.app-menus')){event.preventDefault();const buttons=[...document.querySelectorAll('.app-menus>button')],i=buttons.indexOf(rootMenu().invoker);globalMenu(buttons[(i+(event.key==='ArrowRight'?1:buttons.length-1))%buttons.length]);return;}
        if (open.type === 'menu' && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
          event.preventDefault(); const buttons = [...overlay.querySelectorAll('button:not(:disabled)')], index = buttons.indexOf(document.activeElement);
          buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
        }
        if (event.key === 'Tab') {
          if(open.type==='menu'){
            event.preventDefault();const from=rootMenu()?.invoker||viewport,fields=[...document.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.tabIndex>=0&&!inMenus(el)&&el.getClientRects().length),i=fields.indexOf(from),next=fields[(i+(event.shiftKey?fields.length-1:1))%fields.length];dismiss(false);(next||viewport).focus({preventScroll:true});return;
          }
          const fields = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select:not(:disabled)')], index = fields.indexOf(document.activeElement);
          if ((event.shiftKey && index === 0) || (!event.shiftKey && index === fields.length - 1)) {event.preventDefault(); fields[event.shiftKey ? fields.length - 1 : 0]?.focus();}
        }
        if(open.type==='menu'&&event.key.length===1&&!event.metaKey&&!event.ctrlKey&&!event.altKey){
          const now=performance.now();menuSearch=now-menuSearchTime<650?menuSearch+event.key.toLowerCase():event.key.toLowerCase();menuSearchTime=now;
          const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],start=buttons.indexOf(document.activeElement),ordered=[...buttons.slice(start+1),...buttons.slice(0,start+1)];
          const match=ordered.find(b=>(b.getAttribute('aria-label')||b.textContent).toLowerCase().startsWith(menuSearch));if(match){event.preventDefault();match.focus();}
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();event.stopImmediatePropagation();
          if(beforeAction()){dismiss(false);api.execute('save',currentTarget());}
          return;
        }
        event.stopPropagation(); return;
      }
    }
    if (event.target.closest('#viewport') && ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu')) {
      event.preventDefault(); event.stopImmediatePropagation(); const target = currentTarget();
      if (target.kind === 'canvas') target.point = api.diagramPoint({clientX: viewport.getBoundingClientRect().left + viewport.clientWidth / 2, clientY: viewport.getBoundingClientRect().top + viewport.clientHeight / 2});
      menu(target, {x: viewport.getBoundingClientRect().left + 20, y: viewport.getBoundingClientRect().top + 40}, null); return;
    }
    const pin = event.target.closest('[data-reconnect]');
    if (pin && ['Enter', ' '].includes(event.key)) {event.preventDefault(); event.stopImmediatePropagation(); attachments({kind:'connection', id:pin.dataset.reconnect, ids:[pin.dataset.reconnect], end:pin.dataset.end}, {x:0,y:0}, null);}
  }, true);
  // Delay touch selection until release or a drag. This prevents placement tools
  // from creating an object before a long-press can open its menu.
  function clearTouch() {if (touch) clearTimeout(touch.timer); touch = null;}
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.target.closest('.zoom-toolbar') || state().busy) return;
    if (!event.isPrimary) {clearTouch(); heldTouch = event.pointerId; api.cancelGesture(); event.stopImmediatePropagation(); return;}
    ghostClick = null; heldTouch = null;
    event.stopImmediatePropagation(); viewport.setPointerCapture(event.pointerId);
    touch = {event, x:event.clientX, y:event.clientY, threshold:event.target.closest('[data-reconnect]')?4:3, timer:setTimeout(() => {const original = touch?.event; if (!original) return; clearTouch(); heldTouch = original.pointerId; ghostClick = {x:original.clientX,y:original.clientY,time:performance.now()}; context(original);}, 500)};
  }, true);
  viewport.addEventListener('pointermove', event => {
    if (heldTouch !== null && event.pointerType === 'touch') {event.stopImmediatePropagation(); return;}
    if (!touch || touch.event.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) >= touch.threshold) {const original = touch.event; clearTouch(); api.beginPointer(original);}
    else event.stopImmediatePropagation();
  }, true);
  viewport.addEventListener('pointerup', event => {
    if (heldTouch !== null && event.pointerType === 'touch') {event.stopImmediatePropagation(); heldTouch = null; if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); return;}
    if (touch?.event.pointerId === event.pointerId) {const original = touch.event; clearTouch(); api.beginPointer(original);}
  }, true);
  viewport.addEventListener('pointercancel', () => {clearTouch(); heldTouch = null;}, true);
  viewport.addEventListener('lostpointercapture', clearTouch, true);
  viewport.addEventListener('click', event => {if (ghostClick && performance.now() - ghostClick.time < 800 && Math.hypot(event.clientX - ghostClick.x, event.clientY - ghostClick.y) < 12) {event.preventDefault(); event.stopImmediatePropagation();} ghostClick = null;}, true);
  window.addEventListener('blur', () => {clearTouch(); heldTouch = null;});
  new ResizeObserver(() => {sizeBar(); position();}).observe($('selection-bar'));
  window.addEventListener('resize', position); window.visualViewport?.addEventListener('resize', position);
  narrow.addEventListener('change', () => {
    const panel=document.querySelector('.properties-panel');panel.classList.remove('is-open');
    if(narrow.matches){desktopSourceVisible=!$('source-panel').hidden;desktopInspectorVisible=!panel.hidden;panel.hidden=false;$('source-panel').hidden=true;}
    else{panel.hidden=!desktopInspectorVisible;$('source-panel').hidden=!desktopSourceVisible;}
    $('btn-hierarchy').setAttribute('aria-expanded',String(!$('source-panel').hidden&&!$('hierarchy-content').hidden));$('btn-source').setAttribute('aria-expanded',String(!$('source-panel').hidden&&!$('source-content').hidden));render();position();sizeBar();
  });
  if(narrow.matches){$('source-panel').hidden=true;$('btn-hierarchy').setAttribute('aria-expanded','false');}
  return {render, beforeAction, position, viewChanged() {if (open?.type === 'menu') dismiss(false); else position();}, openAttachment(id, end) {api.select(id);attachments({kind:'connection', id, ids:[id], end}, {x:0,y:0}, null);}, editLabel(id) {edit('label', {kind:'node', id, ids:[id]}, {x:innerWidth / 2 - 140, y:innerHeight / 2 - 100}, null);}};
}
