# Mermaid Diagram Studio

A self-contained local diagram editor. Start with Mermaid, let Mermaid/ELK arrange it, then edit the diagram on the canvas. libavoid reroutes connections around the objects you position manually.

## Run

From this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the editor](http://127.0.0.1:8000/viewer.html). No npm install, build, CDN, account, or internet connection is needed to run it. Use HTTP rather than opening the HTML directly: the browser loads local modules, WebAssembly, and example files. Stop the server with Ctrl+C.

## Edit a diagram

- Choose **New** for an empty canvas, paste Mermaid into the source panel and choose **Apply source**, or use **Open** for `.mmd`, `.mermaid`, `.txt`, or a saved project. New is undoable. Two local examples are available.
- Select and drag nodes. Drag a zone or container node to move its nested contents. Dropping an object into a container adopts it; dropping it out releases it to an enclosing container or top level. The destination is highlighted during the drag. Shift-click extends selection; Shift-drag the background selects objects inside a box.
- **Node** and **Zone** place new objects where you click, or drag either toolbar button onto the canvas. Drag placement shows a preview and returns to Select after release; Escape or releasing outside the canvas cancels it. Objects created inside a zone or enabled container node join the innermost container. **Connect** lets you click a source and then a target. Only the hovered/source node shows handles; you can also drag a handle onto another node. Each completed connection returns to **Select**, with the new edge selected; click **Connect** again to create another. Select an edge to edit it or drag either endpoint to reconnect it.
- The properties panel edits labels, shapes, descriptions, notes, parent membership, edge endpoints, arrow direction, line style, and straight/orthogonal routing. Choosing a parent visibly places the object inside that container; Top level moves it outside the former root container. The canvas reveals the moved object if necessary. Connections sharing a side use separate attachment points, with 12-unit spacing where room allows, and libavoid separates parallel route segments. Orthogonal connections to zones and parent nodes meet the chosen border side cleanly, using outward approaches for external peers and inward approaches for contained objects; container bodies and titles remain traversable. Nodes and zones have eight corner/side resize handles and Width/Height fields. Circles stay round; circle and diamond labels wrap and unwrap as their dimensions change, including short labels. Labels wrap only at whitespace and retain explicit line breaks. Whole words stay intact; an oversized word grows the shape instead of being split. Labels and container contents define minimum sizes. Resizing stops at neighbouring nodes. **Fit to label** restores automatic node sizing.
- Pick **Background color** and **Font color** for nodes and zones in Properties, using a swatch or hex value. The diagram previews valid values immediately while the field stays focused; picker input updates the preview without waiting for click-away. Child zones default to a slightly darker shade of their parent unless explicitly colored. Title bars use a darker shade of the selected background. Nodes, zones, and edges all have Description and Notes fields.
- Drop a node or zone onto an ordinary node, enable **Container node**, or choose an ordinary node in a child’s **Parent** field, to let a node contain other nodes or zones. All five shapes support nesting, while keeping their IDs, shapes, labels, and connections. Children occupy the usable interior beneath the parent title. Moving the parent carries its descendants; resizing respects them. When its final child leaves or is deleted, the parent returns to an ordinary node and restores its earlier manual size. Empty zones remain zones. Deleting or disabling a parent node promotes its children to the enclosing parent or top level.
- **Text** in the toolbar sets every diagram label to 10–48px. It preserves pan/zoom, grows shapes and zones where needed, and keeps manual size preferences. Use a larger value when presenting; **Fit** is a separate command.
- **Guides** shows dark purple side alignment lines while moving/resizing nodes or zones. Guides work with or without Snap grid, stay consistent at different zooms, and are excluded from exports. Resize handles also keep a constant screen size.
- **Hierarchy** shows nested zones/nodes and the diagram's connections. Click an item to select it on the canvas and in Properties; collapse containers to focus the tree. **Source** switches to Mermaid editing.
- Use **Zone** and drag objects in or out to organize the diagram. Drag a zone from its body or title to move its contents together, just like a node. Child objects still drag independently; Shift-drag inside a zone selects objects with a marquee. Group/Ungroup have been removed. Deleting a zone or container node retains its contents. **Arrange** aligns/distributes selected objects. Deleting a node also removes its incident edges.
- Nodes keep a minimum 24-unit gap during placement, dragging, resizing, and both automatic layouts. A dragged selection stops clear of stationary nodes; moving a zone also keeps its border clear of unrelated nodes. Distribution expands the occupied extent when necessary to keep the gap. Crossing connections have small bridges, including in exported images.
- Background dragging pans. Scroll zooms; **Fit** includes the complete current diagram. **Snap grid** enables a 20-unit grid. Grid dots follow pan and zoom; distant views show coarser multiples of the same grid.
- Direction and layout preferences take effect through **Auto layout**. Mermaid/ELK factors in zones and node containers; a final clearance pass accounts for expanded shapes/titles and keeps unrelated sibling objects at least 24 units from container borders. Ordinary edits retain manual placement. Moves, structural edits, source application, and automatic layout support Undo/Redo.

Shortcuts: **V** Select, **H** Pan, **N** Node, **C** Connect, **Z** Zone; hold **Space** on the canvas to pan. Arrow keys nudge by 10 units (20 with snapping), Shift+arrow by 50. **Escape** cancels a gesture/tool, **Delete** removes the selection, **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** redoes, and **Ctrl/Cmd+S** saves.

## Manual connection routes

Select a connection, then drag a **+** handle on a segment to add a waypoint, or choose **Add waypoint** in Properties and click the canvas. Drag the waypoint circles to refine the route. Adding a waypoint changes a straight connection to orthogonal routing. Select a point and use the arrow keys to nudge it or Delete to remove it; the Properties list also has removal buttons. Snap grid applies to waypoint placement and movement. Escape cancels placement or an in-progress drag.

Waypoints use fixed diagram coordinates when only one endpoint moves. When both endpoints move by the same amount in one action, their waypoints travel with them, including movement through nested zones or node containers. Moving one endpoint's container leaves external waypoints fixed. Resizing endpoints and Auto layout preserve manual points. Undo/Redo and project save/open retain them; SVG and PNG exports show the resulting route without editing handles. Mermaid exports retain structure and omit manual routing coordinates.

**Source attachment** and **Target attachment** force a side independently of the waypoints; connections spread their pins along that side. **Reset route** removes all manual points while retaining those side choices. Reset the route before switching back to Straight. Up to 100 waypoints are supported per connection.

Connections sharing a side start in an automatic order. The router can swap neighboring attachments when their nearby paths cross, accepting a native reroute only if it reduces that crossing without introducing crossings, contacts, overlaps, extra detours, or changes to unrelated connections. It holds the settled order during node, resize, and waypoint drags, then evaluates the arrangement on release. Automatic trials are bounded; ambiguous or conflicting arrangements retain the baseline.

Select an edge and use **Move up/down** under Source/Target order, or **Move left/right** on a top/bottom side, to choose the order yourself. This sets the whole side's stack; spacing remains automatic. The chosen order survives movement, resizing, undo, source edits with matching endpoints, and project save/open. New connections append after the chosen attachments; deleted or reconnected ends are removed from the saved stack. Side preferences remain available when an edge temporarily connects elsewhere. **Reset side to automatic** releases the whole active side. **Reset route** keeps the order choice.

A manual order is authoritative, including a choice that creates a crossing. Fixed waypoints can still require adjustment: if moving a node makes two paths share a corridor, reorder the attachments and move the relevant waypoint to give them separate paths. For reordered outgoing terminals, the native router can arrive sideways at the first waypoint to avoid a new backtrack; actual waypoint coordinates remain unchanged. Mermaid export omits attachment-order preferences; project files retain them and image exports show the resulting paths.

A waypoint covered by, or within eight units of, an ordinary node shows a red conflict marker. The route temporarily skips that point and avoids the node, while retaining the point in the project. Select the connection to move the waypoint, or select and move the blocking node to restore the route. Zones and node-container interiors remain traversable.

The router checks for accidental backtracking where waypoint spans meet. It tries one local turn and accepts it only when the route gets no longer, all waypoint and attachment constraints remain intact, obstacles stay clear, and untouched spans and connections keep their paths. Otherwise it retains the original route. Explicit waypoint reversals remain supported. A small alignment step can still be necessary when a fixed waypoint and its target attachment are at different heights. Crossing bridges remain visible at waypoints within straight segments.

## Manual connection labels

Drag a connection's label to place it yourself, or click it and use the arrow keys to nudge it. Snap grid applies to the label centre. Each drag is one undoable edit; Escape cancels it. **Reset label position** in Properties restores automatic placement without changing the route or waypoints.

The label follows its connection when nodes move or the route changes. It retains its position along the route and its offset from the nearby route direction, including when the route turns. Manual placement respects your chosen position even when it overlaps another object; automatic labels avoid manual labels. Select an overlapping node or zone through Hierarchy to move it, or select the connection to drag its label again.

A dotted leader appears whenever the label's attachment point on the route lies outside the label box. It ends at the box border, with a dot on the route. Bringing the label back over that point removes the leader. Automatic labels retain the same collision avoidance and leader behavior.

Project save/open, Undo/Redo, Auto layout, and source changes with matching edge IDs and endpoints retain manual label preferences. SVG and PNG preserve the labels and leaders; Mermaid exports omit manual placement.

## Source, saving, and exports

The editable model becomes authoritative after import. Visual edits generate normalized Mermaid; original comments, whitespace, and shorthand are not preserved. Property labels preview on every input, including node, zone, and edge labels. Labels and colors keep one Undo entry for a continuous input session. Context and size fields commit when you leave the field or perform a canvas, toolbar, save, or export action. Invalid final hex values restore the previous color. An unapplied source draft remains separate and is retained through canvas edits, Undo, and Auto layout. Applying valid source preserves existing object centres by ID; a completely new diagram fits the viewport. Invalid or unsupported source retains the last valid diagram and draft.

**Save project** downloads a versioned `.mermaid-project.json` containing the evolved structure, nested membership, positions, sizes, routing choices, colors, global font size, guide preference, layout settings, and canvas view. **Open** restores this file without automatic layout. Older projects with overlapping/crowded nodes are separated to the minimum gap and marked for saving. Colors, font size, manual size preferences, descriptions, and notes are retained by project files, automatic layout, and source changes with matching IDs; Mermaid/image exports contain the diagram rather than these context fields. Undo history and unapplied source drafts are session-only.

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

These model and routing tests use Node's built-in test runner and the local WASM; no installed npm dependencies are needed. With the local server running, open [browser regression tests](http://127.0.0.1:8000/tests/browser.html) and [UI acceptance tests](http://127.0.0.1:8000/tests/ui.html). Both pages report results automatically. The UI harness exercises real app handlers and inspects generated project/export blobs; it substitutes capture for synthetic pointer gestures and suppresses repeated test downloads. Native pointer and file-picker checks are recorded separately in [tests/ACCEPTANCE.md](tests/ACCEPTANCE.md).

With Playwright and Chromium available, run `DIAGRAM_URL=http://127.0.0.1:8000 node tests/native-attachments.cjs` for native mouse, file-picker, save/reopen, and image-export attachment checks. `CHROMIUM_PATH` can select a browser executable. Results and screenshots are written to `tests/artifacts/`.
