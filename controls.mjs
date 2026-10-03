import { object, items, descendants, zonePadding, objectColors, MAX_ZONE_PADDING } from './core.mjs?v=whole-words';
import { attachmentKey } from './attachments.mjs?v=whole-words';
import { MAX_WAYPOINTS } from './waypoints.mjs?v=whole-words';

const $ = id => document.getElementById(id);
const shapeNames = [['rectangle', 'Rectangle'], ['rounded', 'Rounded rectangle'], ['diamond', 'Diamond'], ['circle', 'Circle'], ['cylinder', 'Database cylinder']];
const sideNames = [['', 'Automatic'], ['north', 'Top'], ['east', 'Right'], ['south', 'Bottom'], ['west', 'Left']];
const alignNames = [['left', 'Left'], ['center-x', 'Horizontal center'], ['right', 'Right'], ['top', 'Top'], ['center-y', 'Vertical center'], ['bottom', 'Bottom']];
const toolNames = [['select', 'Select'], ['pan', 'Pan'], ['node', 'Node'], ['connect', 'Connect'], ['zone', 'Zone']];

// Each surface captures a target, then calls the application's existing operation.
// Menus never infer a canvas point from the position of their DOM element.
export function createEditingControls(api) {
  const overlay = $('editing-overlay'), bar = $('selection-actions'), viewport = $('viewport');
  let open = null, barKey = '', touch = null, heldTouch = null, ghostClick = null, blockedClick = false;
  const narrow = matchMedia('(max-width: 850px)');
  const state = () => api.state();
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
    if (command === 'align' && rootCount(target) < 2) return 'Select at least two separate nodes or zones';
    if (command === 'distribute' && rootCount(target) < 3) return 'Select at least three separate nodes or zones';
    if (command === 'reset-route' && !n?.waypoints?.length) return 'This connection has no manual waypoints';
    if (command === 'reset-label' && !n?.labelPosition) return 'This label has automatic placement';
    if (command === 'waypoint' && (n?.waypoints?.length || 0) >= MAX_WAYPOINTS) return `A connection can have at most ${MAX_WAYPOINTS} waypoints`;
    return '';
  }
  function available(b, command, target) {
    const why = reason(command, target); b.disabled = Boolean(why);
    b.title = why || b.textContent; b.setAttribute('aria-disabled', String(Boolean(why)));
    if (why) b.setAttribute('aria-description', why); else b.removeAttribute('aria-description');
  }
  function hasZones(target) { return target.ids.some(id => state().model.zones.some(z => z.id === id)); }
  function definitions(target) {
    const n = targetItem(target), row = (command, label) => ({command, label});
    switch (target.kind) {
      case 'node': return [row('label', 'Edit label'), row('shape', 'Shape'), row('color', 'Color'), row('connect', 'Connect from here'), row('fit-label', 'Fit to label'), row('container', n?.container ? 'Disable container' : 'Enable container'), row('details', 'Details'), row('delete', 'Delete node')];
      case 'connection': return [row('label', 'Edit label'), row('style', 'Line style'), row('arrows', 'Arrows'), row('waypoint', target.point ? 'Add waypoint here' : 'Add waypoint'), row('attachments', 'Attachments'), row('reset-label', 'Reset label position'), row('reset-route', 'Reset route'), row('details', 'Details'), row('delete', 'Delete connection')];
      case 'label': return [row('label', 'Edit label'), row('reset-label', 'Reset label position'), row('connection-actions', 'Connection actions')];
      case 'waypoint': return [row('remove-waypoint', 'Remove waypoint'), row('connection-actions', 'Connection actions')];
      case 'zone': return [row('label', 'Edit label'), row('fit-zone', 'Fit to contents'), row('padding', 'Padding'), row('color', 'Color'), row('details', 'Details'), row('delete', 'Delete zone')];
      case 'multiple': return [row('align', 'Align'), row('distribute', 'Distribute'), ...(hasZones(target) ? [row('fit-zone', 'Fit selected zones')] : []), row('details', 'Details'), row('delete', 'Delete selection')];
      default: return [row('node', target.point ? 'Add node here' : 'Add node'), row('zone', target.point ? 'Add zone here' : 'Add zone'), row('fit-diagram', 'Fit diagram')];
    }
  }
  function barActions(target) {
    const row = (command, label) => ({command, label});
    switch (target.kind) {
      case 'node': return [row('shape', 'Shape'), row('color', 'Color'), row('connect', 'Connect'), row('fit-label', 'Fit to label')];
      case 'connection': return [row('style', 'Line style'), row('arrows', 'Arrows'), row('waypoint', 'Add waypoint'), row('attachments', 'Attachments')];
      case 'zone': return [row('fit-zone', 'Fit to contents'), row('padding', 'Padding'), row('color', 'Color')];
      case 'multiple': return [row('align', 'Align'), row('distribute', 'Distribute'), ...(hasZones(target) ? [row('fit-zone', 'Fit zones')] : [])];
      case 'waypoint': return [row('remove-waypoint', 'Remove waypoint'), row('connection-actions', 'Connection actions')];
      default: return [];
    }
  }
  function dismiss(restore = true) {
    const old = open; open = null; overlay.hidden = true; overlay.replaceChildren();
    if (old?.invoker) old.invoker.setAttribute('aria-expanded', 'false');
    if (restore && old) (old.invoker?.isConnected ? old.invoker : viewport).focus({preventScroll: true});
  }
  function position() {
    if (!open) return;
    let {x, y} = open.anchor;
    if (open.type === 'attachment') {
      const path = state().routes.get(open.target.id), p = open.target.end === 'source' ? path?.[0] : path?.at(-1);
      if (p) {
        const v = state().model.settings.view, b = viewport.getBoundingClientRect(), side = attachmentGroup(open.target)?.side;
        const px = b.left + v.x + p.x * v.scale, py = b.top + v.y + p.y * v.scale;
        x = side === 'west' ? px - overlay.offsetWidth - 14 : side === 'east' ? px + 14 : px - overlay.offsetWidth / 2;
        y = side === 'north' ? py - overlay.offsetHeight - 14 : side === 'south' ? py + 14 : py - 20;
      }
    } else if (open.invoker?.isConnected && open.anchor.element) {
      const b = open.invoker.getBoundingClientRect(); x = b.left; y = b.bottom + 6;
    }
    const visual = window.visualViewport, left = visual?.offsetLeft || 0, top = visual?.offsetTop || 0;
    const width = visual?.width || innerWidth, height = visual?.height || innerHeight;
    overlay.style.maxHeight = `${Math.max(100, height - 16)}px`;
    overlay.style.left = `${Math.max(left + 8, Math.min(x, left + width - overlay.offsetWidth - 8))}px`;
    overlay.style.top = `${Math.max(top + 8, Math.min(y, top + height - overlay.offsetHeight - 8))}px`;
  }
  function show(type, target, anchor, invoker, title) {
    dismiss(false); open = {type, target, anchor, invoker}; overlay.hidden = false;
    overlay.className = `editing-overlay ${type}-popover`; overlay.setAttribute('role', type === 'menu' ? 'menu' : 'dialog');
    overlay.setAttribute('aria-label', title); if (invoker) invoker.setAttribute('aria-expanded', 'true');
    if (type !== 'menu') {const h = document.createElement('h2'); h.textContent = title; overlay.append(h);}
  }
  function anchorFor(invoker) { const b = invoker.getBoundingClientRect(); return {x: b.left, y: b.bottom + 6, element: true}; }
  function menu(target, anchor, invoker, entries = definitions(target), title = 'Actions') {
    if (!beforeAction()) return;
    show('menu', target, anchor, invoker, title);
    for (const entry of entries) {
      const b = button(entry.label, () => activate(entry.command, target, anchor, invoker, entry.value));
      b.dataset.command = entry.command; b.setAttribute('role', entry.selected ? 'menuitemradio' : 'menuitem');
      if (entry.selected !== undefined) { b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(entry.selected)); }
      if (entry.command === 'delete') b.classList.add('danger');
      if (['details', 'delete'].includes(entry.command)) b.classList.add('menu-separated');
      available(b, entry.command, target); overlay.append(b);
    }
    position(); overlay.querySelector('button:not(:disabled)')?.focus({preventScroll: true});
  }
  function choices(command, values, selected, target, anchor, invoker, title) {
    menu(target, anchor, invoker, values.map(([value, label]) => ({command, value, label, selected: value === selected})), title);
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
    dismiss(false); api.execute(command, target, value);
    if (command === 'details') {
      const panel = document.querySelector('.properties-panel'); panel.classList.add('is-open');
      (narrow.matches ? $('btn-close-properties') : panel.querySelector('#property-label,.arrange-buttons button'))?.focus({preventScroll:true});
    } else if (!['connect', 'node', 'zone', 'waypoint', 'open', 'source', 'hierarchy'].includes(command)) (invoker?.isConnected ? invoker : viewport).focus({preventScroll: true});
  }
  function edit(command, target, anchor, invoker) {
    api.beginDraft(command, target); show('edit', target, anchor, invoker, {label:'Edit label', padding:'Padding', color:'Color', font:'Text size'}[command]);
    open.command = command; open.fields = new Map();
    const n = targetItem(target), values = command === 'padding' ? zonePadding(n) : command === 'color' ? objectColors(state().model, n) : null;
    function input(key, caption, value, type = 'text') {
      const wrap = document.createElement('div'); wrap.className = 'property-field';
      const label = document.createElement('label'), control = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      control.id = `edit-${key}`; if (type !== 'textarea') control.type = type; else control.rows = 3;
      control.value = value; label.htmlFor = control.id; label.textContent = caption; wrap.append(label, control); overlay.append(wrap); open.fields.set(key, control);
      control.addEventListener('input', validateDraft); return control;
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
      picker.addEventListener('input', () => { c.value = picker.value; validateDraft(); });
      c.addEventListener('input', () => { if (/^#[\da-f]{6}$/i.test(c.value.trim())) picker.value = c.value.trim(); });
    }
    const error = document.createElement('p'); error.id = 'edit-error'; error.className = 'edit-error'; error.setAttribute('role', 'alert'); error.hidden = true; overlay.append(error);
    const actions = document.createElement('div'); actions.className = 'popover-actions';
    const apply = button('Apply', () => beforeAction(true), 'btn-edit-apply'); apply.className = 'primary';
    actions.append(button('Cancel', cancelEdit, 'btn-edit-cancel'), apply); overlay.append(actions);
    position(); const first = open.fields.values().next().value; first.focus({preventScroll: true}); if (command === 'label') first.select();
  }
  function validateDraft() {
    if (open?.type !== 'edit') return true;
    const values = Object.fromEntries([...open.fields].map(([key, control]) => [key, control.value]));
    const result = api.previewDraft(values), message = $('edit-error');
    message.hidden = !result.error; message.textContent = result.error || '';
    for (const [key, control] of open.fields) { control.setAttribute('aria-invalid', String(key === result.field)); control.setAttribute('aria-describedby', 'edit-error'); }
    open.invalid = result.field; return !result.error;
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
    overlay.querySelector('h2').textContent = `${target.end === 'source' ? 'Source' : 'Target'} · ${group.n.label || group.n.id}`;
    for (const b of overlay.querySelectorAll('.attachment-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.end === target.end));
    overlay.querySelector('.attachment-summary').textContent = `${sideNames.find(([side]) => side === group.side)?.[1]} side · ${index + 1} of ${group.entries.length} · ${group.manual ? 'Manual order' : 'Automatic order'}`;
    $('attachment-side').value = e[target.end + 'Side'] || '';
    for (const [id, label, limit, why] of [['attachment-earlier', horizontal ? 'Move left' : 'Move up', index === 0, 'Already first'], ['attachment-later', horizontal ? 'Move right' : 'Move down', index === group.entries.length - 1, 'Already last']]) {
      const b = $(id); b.textContent = label; b.disabled = state().busy || Boolean(state().gesture) || limit; b.title = limit ? why : label;
    }
    $('attachment-reset').disabled = state().busy || Boolean(state().gesture) || !group.manual;
    $('attachment-reset').title = group.manual ? 'Applies to all attachments on this side' : 'This side has automatic order'; position();
  }
  function render() {
    const target = currentTarget(), n = targetItem(target), actions = barActions(target), key = JSON.stringify([target.kind, target.ids, target.index, hasZones(target)]);
    const name = target.kind === 'multiple' ? `${target.ids.length} objects selected` : target.kind === 'canvas' ? 'Select an object to edit it' : target.kind === 'waypoint' ? `Waypoint ${target.index + 1} · ${n?.label || 'Connection'}` : `${{node:'Node', connection:'Connection', zone:'Zone'}[target.kind]} · ${n?.label || n?.id}`;
    $('selection-name').textContent = name; $('selection-name').title = name; $('selection-name').setAttribute('aria-label', name);
    if (key !== barKey) {
      barKey = key; bar.replaceChildren();
      for (const {command, label} of actions) {const b = button(label, () => activate(command, currentTarget(), anchorFor(b), b), `selection-${command}`); b.dataset.command = command; const popup = ['color','attachments','padding'].includes(command) ? 'dialog' : ['shape','style','arrows','align','distribute','connection-actions'].includes(command) ? 'menu' : null; if(popup){b.setAttribute('aria-haspopup',popup);b.setAttribute('aria-expanded','false');} bar.append(b);}
    }
    for (const b of bar.children) available(b, b.dataset.command, target);
    $('btn-selection-more').disabled = state().busy || Boolean(state().gesture);
    $('btn-tool-menu').textContent = `${toolNames.find(([key]) => key === state().tool)?.[1] || 'Place waypoint'} ▾`;
    for (const id of ['btn-tool-menu', 'btn-project-menu', 'btn-diagram-menu']) $(id).disabled = state().busy || Boolean(state().gesture);
    if (open?.type === 'attachment') renderAttachment();
    if (open?.type === 'menu') for (const b of overlay.querySelectorAll('[data-command]')) available(b, b.dataset.command, open.target);
    sizeBar();
  }
  function sizeBar() {
    for (const b of bar.children) b.hidden = false;
    if (!narrow.matches) return;
    const room = $('selection-bar').clientWidth - $('btn-selection-more').offsetWidth - 24;
    let used = 0;
    for (const [index, b] of [...bar.children].entries()) { used += b.offsetWidth + 6; b.hidden = index >= 2 || used > room; }
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
  $('btn-selection-more').addEventListener('click', event => menu(currentTarget(), anchorFor(event.currentTarget), event.currentTarget));
  $('btn-tool-menu').addEventListener('click', event => menu({kind:'global', ids:[]}, anchorFor(event.currentTarget), event.currentTarget, toolNames.map(([value, label]) => ({command:'tool', value, label, selected: value === state().tool})), 'Tools'));
  $('btn-project-menu').addEventListener('click', event => menu({kind:'global', ids:[]}, anchorFor(event.currentTarget), event.currentTarget, [['new','New'],['open','Open…'],['save','Save project'],['export-svg','Export SVG image'],['export-png','Export PNG image'],['export-mermaid','Export Mermaid source'],['hierarchy','Hierarchy'],['source','Source']].map(([command,label]) => ({command,label})), 'Project'));
  $('btn-diagram-menu').addEventListener('click', event => menu({kind:'global', ids:[]}, anchorFor(event.currentTarget), event.currentTarget, [['flow','Flow direction'],['layout','Layout style'],['auto-layout','Auto layout'],['font','Text size']].map(([command,label]) => ({command,label})), 'Diagram'));
  function closeProperties(){api.flushProperties();document.querySelector('.properties-panel').classList.remove('is-open');$('btn-selection-more').focus();}
  $('btn-close-properties').addEventListener('click',closeProperties);
  viewport.addEventListener('contextmenu', event => { if (event.target.closest('.zoom-toolbar')) return; event.preventDefault(); context(event); });
  document.addEventListener('pointerdown', event => {
    blockedClick = false;
    if (!open || overlay.contains(event.target)) return;
    if (!beforeAction()) {blockedClick = true; event.preventDefault(); event.stopImmediatePropagation(); return;}
    dismiss(false);
  }, true);
  document.addEventListener('click', event => {if(blockedClick){blockedClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown', event => {
    if(!open&&narrow.matches&&event.key==='Escape'&&document.querySelector('.properties-panel').classList.contains('is-open')){event.preventDefault();event.stopImmediatePropagation();closeProperties();return;}
    if (open) {
      if (event.key === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); if (open.type === 'edit') cancelEdit(); else dismiss(); return;}
      if (overlay.contains(event.target)) {
        if (open.type === 'menu' && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
          event.preventDefault(); const buttons = [...overlay.querySelectorAll('button:not(:disabled)')], index = buttons.indexOf(document.activeElement);
          buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
        }
        if (event.key === 'Tab') {
          const fields = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select:not(:disabled)')], index = fields.indexOf(document.activeElement);
          if ((event.shiftKey && index === 0) || (!event.shiftKey && index === fields.length - 1)) {event.preventDefault(); fields[event.shiftKey ? fields.length - 1 : 0]?.focus();}
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {if (!beforeAction()) {event.preventDefault(); event.stopImmediatePropagation();} return;}
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
  narrow.addEventListener('change', () => {document.querySelector('.properties-panel').classList.remove('is-open'); position(); sizeBar();});
  if(narrow.matches){$('source-panel').hidden=true;$('btn-hierarchy').setAttribute('aria-expanded','false');}
  return {render, beforeAction, position, viewChanged() {if (open?.type === 'menu') dismiss(false); else position();}, openAttachment(id, end) {api.select(id);attachments({kind:'connection', id, ids:[id], end}, {x:0,y:0}, null);}, editLabel(id) {edit('label', {kind:'node', id, ids:[id]}, {x:innerWidth / 2 - 140, y:innerHeight / 2 - 100}, null);}};
}
