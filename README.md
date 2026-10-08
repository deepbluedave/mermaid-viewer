# Mermaid Diagram Studio

A self-contained local diagram editor. Start with Mermaid, let Mermaid/ELK arrange it, then edit the diagram on the canvas. libavoid reroutes connections around the objects you position manually.

## Run

From this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the editor](http://127.0.0.1:8000/viewer.html). No npm install, build, CDN, account, or internet connection is needed to run it. Use HTTP rather than opening the HTML directly: the browser loads local modules, WebAssembly, and example files. Stop the server with Ctrl+C.

## GitHub Pages

The [hosted editor](https://deepbluedave.github.io/mermaid-viewer/) uses GitHub Pages. In repository **Settings → Pages**, choose **Deploy from a branch**, **main**, and **/(root)**. The root `index.html` opens `viewer.html`; `.nojekyll` publishes the static files directly. No build workflow is required. Assets use relative URLs so the viewer also works beneath the `/mermaid-viewer/` project path.

## Edit a diagram

- Select an object to use the **quick actions in Properties** (or the header **Selection actions** button when the panel is hidden). Change shapes, colors, line styles, arrows, padding, or routes there. Use **More** for all actions, or right-click the object. Double-click a label to edit it. Edit popovers preview changes; **Apply** or a valid click-away makes one Undo step. **Cancel** or Escape restores the opening state. Invalid values keep the editor open.
- Click a selected connection's endpoint to open **Side** and **Move up/down** controls beside it. Top/bottom sides use **Move left/right**. Source and Target tabs identify the end you are editing. Dragging an endpoint still reconnects it.
- **File** contains New diagram, Open, Recent files, Save as, Download a copy, Autosave and Export; **Edit** contains Undo, Redo, Copy and Paste; **Open** and **Save** stay together in the compact header. **View** switches Hierarchy, Mermaid source and Properties. **Diagram** contains Theme, flow direction, layout style, Auto layout and Text size. Menus support arrows, typeahead and keyboard focus return; flyouts keep the parent menu visible; Left/Escape returns to it without moving selected objects.
- On a phone or narrow window, the header has a tool chooser, Undo/Redo, **Selection actions** and **Properties**. Properties opens as a sheet with a Close button. All object actions remain available through Selection actions, right-click or long-press. Touch controls retain 44px targets. Dragging cancels a pending long-press; Shift+F10 opens selection actions from the canvas.
- Choose **File → New diagram** for an empty canvas, paste Mermaid into the source panel and choose **Apply source**, or use **File → Open** for `.mmd`, `.mermaid`, `.txt`, or a saved project. New is undoable. The editor starts blank; local sample files remain in `diagrams/`.
- Select and drag nodes. Drag a zone or container node to move its nested contents. Dropping an object into a container adopts it; dropping it out releases it to an enclosing container or top level. The destination is highlighted during the drag. Shift-click extends selection; Shift-drag the background selects objects inside a box.
- **Node** and **Zone** place new objects where you click, or drag either toolbar button onto the canvas. Drag placement shows a preview and returns to Select after release; Escape or releasing outside the canvas cancels it. Objects created inside a zone or enabled container node join the innermost container. **Connect** lets you press anywhere on a source node or zone, drag to a highlighted target and release to connect. Clicking a source and then a target still works. Contextual handles remain available for explicit attachment sides. Empty drops and Escape cancel the pending connection without recording an edit. Each completed connection returns to **Select**, with the new edge selected; click **Connect** again to create another. Select an edge to edit it or drag either endpoint to reconnect it.
- Properties puts Label, Description and Notes first, with text areas that grow as you type. Compact appearance controls pair Fill/Text and Width/Height; resets appear only for custom colors. The panel also edits shapes, parent membership, edge endpoints, arrow direction, line style, and straight/orthogonal routing. Choosing a parent visibly places the object inside that container; Top level moves it outside the former root container. The canvas reveals the moved object if necessary. Connections sharing a side use separate attachment points, with 12-unit spacing where room allows, and libavoid separates parallel route segments. Orthogonal connections to zones and parent nodes meet the chosen border side cleanly, using outward approaches for external peers and inward approaches for contained objects; container bodies and titles remain traversable. Nodes and zones have eight corner/side resize handles and Width/Height fields. Circles stay round; circle and diamond labels wrap and unwrap as their dimensions change, including short labels. Labels wrap only at whitespace and retain explicit line breaks. Whole words stay intact; an oversized word grows the shape instead of being split. Labels and container contents define minimum sizes. Resizing stops at neighbouring nodes. **Fit to label** restores automatic node sizing.
- Pick **Fill** and **Text** colors for nodes and zones in Properties, using a swatch or hex value. The diagram previews valid values immediately while the field stays focused; picker input updates the preview without waiting for click-away. Child zones default to a slightly darker shade of their parent unless explicitly colored. Title bars use a darker shade of the selected background. Nodes, zones, and edges all have Description and Notes fields.
- Drop a node or zone onto an ordinary node, enable **Container node**, or choose an ordinary node in a child’s **Parent** field, to let a node contain other nodes or zones. All five shapes support nesting, while keeping their IDs, shapes, labels, and connections. Children occupy the usable interior beneath the parent title. Moving the parent carries its descendants; resizing respects them. When its final child leaves or is deleted, the parent returns to an ordinary node and restores its earlier manual size. Empty zones remain zones. Deleting or disabling a parent node promotes its children to the enclosing parent or top level.
- **Diagram → Text size** sets every diagram label to 10–48px. It preserves pan/zoom, grows shapes and zones where needed, and keeps manual size preferences. Use a larger value when presenting; **Fit diagram** is a separate command.
- **Guides** shows dark purple side alignment lines while moving/resizing nodes or zones. Guides work with or without Snap grid, stay consistent at different zooms, and are excluded from exports. Resize handles also keep a constant screen size.
- **Hierarchy** shows nested zones/nodes and the diagram's connections. Click an item to select it on the canvas and in Properties; collapse containers to focus the tree. **View → Mermaid source** switches to Mermaid editing.
- Use **Zone** and drag objects in or out to organize the diagram. Drag a zone from its body or title to move its contents together, just like a node. Child objects still drag independently; Shift-drag inside a zone selects objects with a marquee. Group/Ungroup have been removed. Deleting a zone or container node retains its contents. **Align** and **Distribute** arrange selected objects. Deleting a node also removes its incident edges.
- Select zones with Shift-click on the canvas or in Hierarchy, then use **Align** or **Distribute** in the selection actions. Properties retains shortcuts for these actions. Each selected root moves with all its descendants, preserving internal positions, membership, and size. Selecting a parent and child moves the child once. Clearance moves whole groups along the other axis, retaining the alignment and leaving stationary objects in place.
- **Fit zone to contents** tightens the frame around its immediate children without moving them. Nested zone frames count as content; they retain their manual sizes unless also selected for fitting. **Fit selected zones to contents** fits selected descendants before their ancestors. Empty zones keep their position and fit to title/padding minima. **Content padding** controls each side separately, with Below title reserving space after the title bar. Existing projects retain 20 units at the sides/bottom and 14 below the title; values from 0 to 1,000 are supported. Padding survives project save/open, matching-ID source edits and Auto layout.
- Zone frames grow when their children need room and retain that extra room when children move back. Shrink explicitly with Fit, Width/Height, or a resize handle. Handles stop at the title, padding and content boundary while preserving their opposite sides; numeric size changes anchor the upper-left corner. These actions preserve child positions and are undoable.
- Nodes keep a minimum 24-unit gap during placement, dragging, resizing, and both automatic layouts. A dragged selection stops clear of stationary nodes; moving a zone also keeps its border clear of unrelated nodes. Distribution expands the occupied extent when necessary to keep the gap. Crossing connections have small bridges, including in exported images.
- Background dragging pans. Scroll zooms; **Fit diagram** includes the complete current diagram. **Snap grid** enables a 20-unit grid. Grid dots follow pan and zoom; distant views show coarser multiples of the same grid.
- Direction and layout preferences take effect through **Auto layout**. Mermaid/ELK factors in zones and node containers; a final clearance pass accounts for expanded shapes/titles and keeps unrelated sibling objects at least 24 units from container borders. Ordinary edits retain manual placement. Moves, structural edits, source application, and automatic layout support Undo/Redo.

Shortcuts: **V** Select, **H** Pan, **N** Node, **C** Connect, **Z** Zone; hold **Space** on the canvas to pan. Arrow keys nudge by 10 units (20 with snapping), Shift+arrow by 50. **Escape** cancels a gesture/tool, **Delete** removes the selection, **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** redoes, **Ctrl/Cmd+C/V** copies/pastes diagram selections, and **Ctrl/Cmd+S** saves. Text fields keep their usual clipboard behaviour.

## Manual connection routes

Select a connection, then drag a **+** handle on a segment to add a waypoint, or choose **Add waypoint** in Properties and click the canvas. Drag the waypoint circles to refine the route. Adding a waypoint changes a straight connection to orthogonal routing. Select a point and use the arrow keys to nudge it or Delete to remove it; the Properties list also has removal buttons. Snap grid applies to waypoint placement and movement. Escape cancels placement or an in-progress drag.

Waypoints use fixed diagram coordinates when only one endpoint moves. When both endpoints move by the same amount in one action, their waypoints travel with them, including movement through nested zones or node containers. Moving one endpoint's container leaves external waypoints fixed. Resizing endpoints and Auto layout preserve manual points. Undo/Redo and project save/open retain them; SVG and PNG exports show the resulting route without editing handles. Mermaid exports retain structure and omit manual routing coordinates.

**Source attachment** and **Target attachment** force a side independently of the waypoints; connections spread their pins along that side. **Reset route** removes all manual points while retaining those side choices. Reset the route before switching back to Straight. Up to 100 waypoints are supported per connection.

Connections sharing a side start in an automatic order. The router can swap neighboring attachments when their nearby paths cross, accepting a native reroute only if it reduces that crossing without introducing crossings, contacts, overlaps, extra detours, or changes to unrelated connections. It holds the settled order during node, resize, and waypoint drags, then evaluates the arrangement on release. Automatic trials are bounded; ambiguous or conflicting arrangements retain the baseline.

Select an edge and use **Move up/down** under Source/Target order, or **Move left/right** on a top/bottom side, to choose the order yourself. This sets the whole side's stack; spacing remains automatic. The chosen order survives movement, resizing, undo, source edits with matching endpoints, and project save/open. New connections append after the chosen attachments; deleted or reconnected ends are removed from the saved stack. Side preferences remain available when an edge temporarily connects elsewhere. **Reset side order** releases the whole active side. **Reset route** keeps the order choice.

A manual order is authoritative, including a choice that creates a crossing. Fixed waypoints can still require adjustment: if moving a node makes two paths share a corridor, reorder the attachments and move the relevant waypoint to give them separate paths. For reordered outgoing terminals, the native router can arrive sideways at the first waypoint to avoid a new backtrack; actual waypoint coordinates remain unchanged. Mermaid export omits attachment-order preferences; project files retain them and image exports show the resulting paths.

A waypoint covered by, or within eight units of, an ordinary node shows a red conflict marker. The route temporarily skips that point and avoids the node, while retaining the point in the project. Select the connection to move the waypoint, or select and move the blocking node to restore the route. Zones and node-container interiors remain traversable.

The router checks for accidental backtracking where waypoint spans meet. It tries one local turn and accepts it only when the route gets no longer, all waypoint and attachment constraints remain intact, obstacles stay clear, and untouched spans and connections keep their paths. Otherwise it retains the original route. Explicit waypoint reversals remain supported. A small alignment step can still be necessary when a fixed waypoint and its target attachment are at different heights. Crossing bridges remain visible at waypoints within straight segments.

## Manual connection labels

Drag a connection's label to place it yourself, or click it and use the arrow keys to nudge it. Snap grid applies to the label centre. Each drag is one undoable edit; Escape cancels it. **Reset label position** in Properties restores automatic placement without changing the route or waypoints.

The label follows its connection when nodes move or the route changes. It retains its position along the route and its offset from the nearby route direction, including when the route turns. Manual placement respects your chosen position even when it overlaps another object; automatic labels avoid manual labels. Select an overlapping node or zone through Hierarchy to move it, or select the connection to drag its label again.

A dotted leader appears whenever the label's attachment point on the route lies outside the label box. It ends at the box border, with a dot on the route. Bringing the label back over that point removes the leader. Automatic labels retain the same collision avoidance and leader behavior.

Project save/open, Undo/Redo, Auto layout, and source changes with matching edge IDs and endpoints retain manual label preferences. SVG and PNG preserve the labels and leaders; Mermaid exports omit manual placement.

## Diagram themes

Use **Diagram → Theme**. Choose Clean, Blueprint, Botanical, or Paper. Each card shows a small diagram preview. Clean retains the original white nodes and soft grey zones. Other themes use quiet node fills and coordinated stage colors. Stage colors follow object IDs, so moving, renaming or reordering a zone does not change its color. Nested zones shade their parent, including a parent's custom fill.

Themes set defaults. Each object's background and text color can be overridden independently in **Color** or **Properties**. **Theme** means the color follows the defaults; **Custom** means the object has an override. **Reset to theme** clears only that color. Changing a fill does not create a text override. Automatic text adjusts for readable contrast; explicit text colors remain your choice.

A theme change is one Undo step. It changes no positions, sizes, routes, waypoints or label placements. Project JSON stores the optional `settings.theme` ID and explicit object color overrides. Older projects use Clean. Applying source preserves the theme and matching-ID overrides. New diagrams and newly opened Mermaid files start with Clean. SVG and PNG exports retain the theme; Mermaid source contains the structure.

## Source, saving, and exports

The editable model becomes authoritative after import. Visual edits generate normalized Mermaid; original comments, whitespace, and shorthand are not preserved. Property labels preview on every input, including node, zone, and edge labels. Labels, colors, Description and Notes preview valid typing while keeping one Undo entry for a continuous input session. Size fields commit when you leave the field or perform a canvas, toolbar, save, or export action. Invalid final hex values restore the previous color. An unapplied source draft remains separate and is retained through canvas edits, Undo, and Auto layout. Applying valid source preserves existing object centres by ID; a completely new diagram fits the viewport. Invalid or unsupported source retains the last valid diagram and draft.

**Open** connects a JSON project to its original disk file in browsers with the [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access), using a secure origin such as this localhost server. **Save** or **Ctrl/Cmd+S** writes that working file; a new diagram asks for a location. **Save as…** chooses and connects another file only after a successful write. **Download a copy** retains the current connection and unsaved state. Opening Mermaid or an example imports a new diagram; its first project save creates JSON and does not overwrite the source.

**File → Autosave** is a browser preference, initially off. Your choice persists across New, Open, recovery and browser sessions, and is shared by tabs on the same origin. You can turn it on before choosing a file; it starts writing once a working file is connected. It saves after one second of idle time, including valid focused label, Description and Notes typing and Undo/Redo. Completed gestures save; cancelled gestures and unapplied popup previews do not. Saving keeps the editor usable and preserves the original typing session's Undo boundary. The footer shows the filename and **Unsaved changes**, **Saving…**, **Saved**, or a paused state. Changes made during a write remain unsaved until their own write succeeds.

File permission or write failures retain your edits and offer retry or a copy. An externally changed file pauses writing and offers **Reload file**, **Save as…**, or explicit **Overwrite**. Reload validates the disk project before replacing the current diagram. New and Open protect unsaved changes; a transition waits for outstanding writes. Open/reload starts a fresh Undo history. New remains undoable, but Undo cannot reconnect or overwrite its previous working file.

Browsers without direct file access use the existing upload/download flow. Save downloads a `.mermaid-project.json` and reports **Downloaded copy**; it cannot update the original file. The autosave preference remains available for use in a compatible browser. The same fallback applies when the browser blocks its native picker.

**File → Recent files…** lists the ten most recently opened or saved files. Local files reopen their current disk content through retained handles, subject to browser permission. Where handles cannot be retained, the list identifies a **Browser copy** and reopens its last imported content without claiming an original-file connection. Remove an entry with its × button. Cancelled and invalid imports are excluded. Recent history uses browser IndexedDB; blocked storage retains a list for the current session.

Project JSON remains version 1 and retains the evolved structure, membership, positions, dimensions, routes, appearance, context, settings and canvas view. Open restores it without Auto layout. Legacy crowded geometry is repaired and marked for saving. File handles, autosave preferences and Undo history are separate from project JSON.

The browser also keeps a recovery copy of unsaved valid edits and any unapplied Mermaid draft. After refresh/crash, **Restore recovery** restores those edits with your autosave preference retained and no assumed disk permission. Use Save to choose or reconnect the original working file. **File → Browser recovery…** exposes available copies when reopening a tab/session without its previous tab identity. A new tab does not automatically offer another active tab's recovery; restoring such a copy retains the other tab's record. Recovery is explicitly labelled and is never treated as a disk save. It depends on available browser storage and is separate per tab; private browsing, cleared storage or quota limits can prevent recovery.

Nodes and zones have a **Show description** checkbox in Properties and object actions. It displays the description on the canvas while retaining the label in the hierarchy and Mermaid source. Descriptions wrap at spaces; parent nodes and zones reserve a taller header above their children. The toggle persists in JSON, clipboard sections and SVG/PNG exports. Shape menus include small shape previews.

## Copy and paste

Select one or more objects and use **Ctrl/Cmd+C/V**, **Edit → Copy/Paste**, or the object/canvas menu. **Paste here** centres the section on the chosen canvas point. Keyboard paste offsets repeated copies and reveals sections whose original coordinates are offscreen. The system clipboard carries a versioned diagram fragment, so whole sections can move between projects and tabs; if a browser blocks menu clipboard access, use the keyboard shortcuts on the canvas.

Copying a zone or parent node includes every descendant, including collapsed children. Selecting an ancestor and child copies the child once. Connections between copied endpoints are included automatically; connections to uncopied objects stay behind. Each paste remaps object IDs, parents, endpoints and attachment-order keys, preserving relative arrangement, explicit styles, context, dimensions, nesting, waypoints and manual label preferences. Inherited styles follow the destination theme/font. Existing routing and clearance apply. The pasted section is selected, is one Undo step and participates in autosave. Copy itself creates no edit.

A connection-only selection can be duplicated between the same existing endpoints in its original open diagram. Include its endpoint nodes to paste it into another diagram. Clipboard operations in Source, Properties and other text fields retain normal text behaviour.

**Export** offers:

- **SVG** and **PNG** of the complete current arrangement, with embedded styling and no editing handles.
- **Mermaid** describing the current supported structure. Container nodes become nested Mermaid subgraphs, with reserved `%% diagram-studio-container` comments recording their shapes for this editor. Standard Mermaid renders these as subgraphs; reopening a project retains the exact parent-node appearance and manual arrangement. Importing a Mermaid export generates a fresh initial layout and restores the container shapes. Empty labels use a zero-width entity in generated Mermaid.

## Supported scope

Editable `flowchart` and `graph` definitions; nested subgraphs as zones; rectangle, rounded rectangle, diamond, circle, and database-cylinder nodes; normal/dashed/thick edges; directed, undirected, and bidirectional arrows; parallel connections and self-loops. The editor supports node/zone background and font colors and a shared diagram font size. Imported custom Mermaid styling is outside the supported subset. Unsupported shapes, custom styles/classes, Markdown formatting, accessibility metadata, callbacks/links, advanced assets, HTML other than line breaks, and other diagram types are rejected with an explanation.

Projects support up to 500 nodes/zones and 1,000 connections. Orthogonal paths avoid ordinary node bounds and pass freely through zones and parent-node interiors, including their titles. Titles sit above connections with translucent backing, keeping crossing lines visible but subdued. Automatic edge labels avoid nodes, titles, arrowheads, and other labels; displaced labels use a stronger dotted leader to identify their connection. Exports preserve these appearances. Layers, collaboration, and other Mermaid diagram types are deferred as specified in [SPEC.md](SPEC.md).

## Libraries and distribution

All runtime assets are in `vendor/`. See [third-party licences](vendor/THIRD-PARTY-LICENSES.md), [libavoid source/build/replacement instructions](vendor/libavoid/SOURCE.md), and [ELK source notices](vendor/source/README.md). Preserve licence files, notices, and included source archives when redistributing this app. Library documentation/source links are attribution, not runtime dependencies.

The application modules are ordinary HTML/CSS/JavaScript. To reproduce the Mermaid bundle during development, use Node.js 22.12 or later:

```sh
npm ci --ignore-scripts
npm run build:vendor
```

This development command downloads the pinned dependencies and bundles Mermaid 12.0.0 with its ELK implementation. It also collects contributing package licences and writes a build manifest. libavoid-js 0.5.0-beta.5 is distributed separately as its unmodified wrapper and WASM.

## Verify

```sh
npm test
```

These model and routing tests use Node's built-in test runner and the local WASM; no installed npm dependencies are needed. With the local server running, open [browser regression tests](http://127.0.0.1:8000/tests/browser.html) , [UI acceptance tests](http://127.0.0.1:8000/tests/ui.html), and [file/clipboard acceptance tests](http://127.0.0.1:8000/tests/storage.html). All pages report results automatically. The file/clipboard harness supplies controlled file handles and clipboard permission results while exercising the actual UI handlers, including failure, conflict, recovery and concurrency paths. The UI harness exercises real app handlers and inspects generated project/export blobs; it substitutes capture for synthetic pointer gestures and suppresses repeated test downloads. Native pointer and file-picker checks are recorded separately in [tests/ACCEPTANCE.md](tests/ACCEPTANCE.md).

Earlier native automation scripts are retained for the preceding controls revisions. With Playwright and Chromium available, run `DIAGRAM_URL=http://127.0.0.1:8000 node tests/native-controls.cjs` for selection bars, menus, popup editors, attachment controls, mobile layouts, keyboard access, and native touch gestures. It builds an orchard supply diagram through the UI and saves evidence in `tests/artifacts/controls/`. Run `tests/native-attachments.cjs` for attachment checks or `tests/native-zones.cjs` for zone alignment, fitting, padding and resize checks. All use native input, file pickers, save/reopen, and image exports. `CHROMIUM_PATH` can select a browser executable.

Run `DIAGRAM_URL=http://127.0.0.1:8000 node tests/native-themes.cjs` for theme and override user sessions. It builds a Moonlight seed library from Mermaid, edits it through the UI, and checks desktop, keyboard, mobile touch, Undo, source edits, layout, save/open and exports. Screenshots and results are saved in `tests/artifacts/themes/`.

The [Southartica architecture diagram](diagrams/architecture/README.md) maps the application with Blueprint, complete project descriptions and working notes. Its editable JSON retains context and arrangement; the companion Mermaid file retains the structure.


## Mermaid extensions and agent tools

Human and Agent actor presets use the local `studio` icon pack. The Shape menu also
includes stadium, hexagon, document, cloud, Mermaid person and configurable icons.
Choose **Shape → Icon**, then click the icon preview in Properties to open the
searchable picker. Browse all packs or filter Studio, Tabler, Lucide, Carbon, Phosphor,
Fluent Color and SVG Logos. The six full Iconify packs provide 23,729 icons, alongside
our five Studio icons. Search names or references, such as `tabler:ai-agent`,
`lucide:bot` or `logos:redis`. Human/person and agent/robot searches find actor icons.
Keyboard arrows navigate the results; Enter selects, Escape cancels. **Show more**
extends browsing without creating thousands of preview elements at once.

All pack data is bundled in `vendor/icons/`; only the required packs load from app
assets. No icon API or CDN is contacted, including on GitHub Pages. Wide logos retain
their proportions, monochrome icons follow Text color, and coloured icons retain their
original palette. SVG/PNG exports embed the artwork. Unknown references show a question
mark. Properties retains a manual reference field, background, size and label position.
Actor containers keep a small icon in the header. Pack versions, sources and full
licenses are in [vendor/icons/README.md](vendor/icons/README.md). Rebuild with
`npm ci` and `npm run build:icons`.

Select **Text format → Markdown** to use **bold**, *italic* or ***both*** in labels
and displayed descriptions. Line breaks and escaped markers are supported; plain
text stays literal. HTML, links, lists and code are intentionally outside this scope.

Mermaid imports accept common `classDef`, `class`, `style` and `linkStyle` properties:
fill, text color, stroke color, width and solid/dashed lines. Exports carry resolved
colors from the theme and custom appearance. **Portable Mermaid** replaces newer
shapes/icons with traditional labeled shapes; editor comments restore those fields
on reimport. Standard icon syntax needs a Mermaid version supporting icons; renderers
without the referenced pack use Mermaid’s native missing-icon fallback. Portable
exports keep readable labels and traditional shapes without needing any icon pack.

Use the canvas chevron or **Collapse/Expand container** in Properties/actions to hide
children. External connections attach to the collapsed group, while the project keeps
real endpoints, expanded dimensions, positions and nested collapse settings. Selecting
a hidden item in Hierarchy expands its ancestors. Expand a group before adjusting a
hidden node’s attachment order. JSON and clipboard copies retain all hidden content.

On browsers that expose WebMCP, the editor registers five tools automatically:
`get_diagram`, `edit_diagram`, `apply_mermaid`, `arrange_diagram`, `export_diagram`.
An agent reads the current revision before editing. Batches commit as one Undo step;
stale, invalid, cancelled and conflicting requests leave the project intact. Tools
respect source drafts, active edits and file conflicts, and successful changes follow
the existing autosave preference. Export tools return content without triggering a
download. No JavaScript execution or filesystem handles are exposed.

WebMCP remains an experimental browser API and requires a compatible agent-enabled
browser in a secure context (HTTPS or localhost). Ordinary editing works when the API
is absent. The implementation feature-detects `document.modelContext` and the legacy
navigator interface. See [Chrome’s imperative API documentation](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
and the [WebMCP draft](https://webmachinelearning.github.io/webmcp/).

The acceptance specification is [EXTENSIONS-SPEC.md](EXTENSIONS-SPEC.md). Run `npm test`
for model/routing/tool tests. With the local server running, open `tests/browser.html`,
`tests/ui.html`, `tests/storage.html`, `tests/extensions.html` and
`tests/extensions-ui.html` and `tests/icons.html` for real Mermaid, UI, persistence,
local icon packs and native WebMCP tests.
The native WebMCP cases need a browser providing `modelContext.getTools/executeTool`.
