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
- Select and drag nodes. Drag a zone's header to move its nested contents. Dropping a node or zone into another zone adopts it; dropping it out releases it to the enclosing zone or top level. The destination zone is highlighted during the drag. Shift-click extends selection; Shift-drag the background selects objects inside a box.
- **Node** and **Zone** place new objects where you click. Objects created inside a zone join the innermost containing zone. **Connect** lets you click a source and then a target. Only the hovered/source node shows handles; you can also drag a handle onto another node. Select an edge to edit it or drag either endpoint to reconnect it.
- The properties panel edits labels, shapes, descriptions, notes, zone membership, edge endpoints, arrow direction, line style, and straight/orthogonal routing. Choosing a parent visibly places the object inside that zone; Top level moves it outside the former root zone. The canvas reveals the moved object if necessary. Connections sharing a side use separate attachment points, with 12-unit spacing where room allows, and libavoid separates parallel route segments. Nodes and zones have eight corner/side resize handles and Width/Height fields. Circles stay round; labels and zone contents define minimum sizes. Resizing stops at neighbouring nodes. **Fit to label** restores automatic node sizing.
- Pick **Background color** and **Font color** for nodes and zones in Properties, using a swatch or hex value. Nodes, zones, and edges all have Description and Notes fields.
- **Text** in the toolbar sets every diagram label to 10–48px. It preserves pan/zoom, grows shapes and zones where needed, and keeps manual size preferences. Use a larger value when presenting; **Fit** is a separate command.
- **Guides** shows subtle side alignment lines while moving/resizing nodes or zones. Guides work with or without Snap grid, stay consistent at different zooms, and are excluded from exports. Resize handles also keep a constant screen size.
- **Hierarchy** shows nested zones/nodes and the diagram's connections. Click an item to select it on the canvas and in Properties; collapse zones to focus the tree. **Source** switches to Mermaid editing.
- Use **Zone** and drag objects in or out to organize the diagram. Group/Ungroup have been removed. Deleting a zone retains its contents. **Arrange** aligns/distributes selected objects. Deleting a node also removes its incident edges.
- Nodes keep a minimum 24-unit gap during placement, dragging, resizing, and both automatic layouts. A dragged selection stops clear of stationary nodes; moving a zone also keeps its border clear of unrelated nodes. Distribution expands the occupied extent when necessary to keep the gap. Crossing connections have small bridges, including in exported images.
- Background dragging pans. Scroll zooms; **Fit** includes the complete current diagram. **Snap grid** enables a 20-unit grid. Grid dots follow pan and zoom; distant views show coarser multiples of the same grid.
- Direction and layout preferences take effect through **Auto layout**. Ordinary edits retain manual placement. Moves, structural edits, source application, and automatic layout support Undo/Redo.

Shortcuts: **V** Select, **H** Pan, **N** Node, **C** Connect, **Z** Zone; hold **Space** on the canvas to pan. Arrow keys nudge by 10 units (20 with snapping), Shift+arrow by 50. **Escape** cancels a gesture/tool, **Delete** removes the selection, **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** redoes, and **Ctrl/Cmd+S** saves.

## Source, saving, and exports

The editable model becomes authoritative after import. Visual edits generate normalized Mermaid; original comments, whitespace, and shorthand are not preserved. Property label, context, and size edits commit when you leave the field or perform a canvas, toolbar, save, or export action. An unapplied source draft remains separate and is retained through canvas edits, Undo, and Auto layout. Applying valid source preserves existing object centres by ID; a completely new diagram fits the viewport. Invalid or unsupported source retains the last valid diagram and draft.

**Save project** downloads a versioned `.mermaid-project.json` containing the evolved structure, nested membership, positions, sizes, routing choices, colors, global font size, guide preference, layout settings, and canvas view. **Open** restores this file without automatic layout. Older projects with overlapping/crowded nodes are separated to the minimum gap and marked for saving. Colors, font size, manual size preferences, descriptions, and notes are retained by project files, automatic layout, and source changes with matching IDs; Mermaid/image exports contain the diagram rather than these context fields. Undo history and unapplied source drafts are session-only.

**Export** offers:

- **SVG** and **PNG** of the complete current arrangement, with embedded styling and no editing handles.
- **Mermaid** describing the current supported structure. Manual positions are preserved in project files. Importing a Mermaid export generates a fresh initial layout. Empty labels use a zero-width entity in generated Mermaid.

## Supported scope

Editable `flowchart` and `graph` definitions; nested subgraphs as zones; rectangle, rounded rectangle, diamond, circle, and database-cylinder nodes; normal/dashed/thick edges; directed, undirected, and bidirectional arrows; parallel connections and self-loops. The editor supports node/zone background and font colors and a shared diagram font size. Imported custom Mermaid styling is outside the supported subset. Unsupported shapes, custom styles/classes, Markdown formatting, accessibility metadata, callbacks/links, advanced assets, HTML other than line breaks, and other diagram types are rejected with an explanation.

Projects support up to 500 nodes/zones and 1,000 connections. Orthogonal paths avoid node bounds and pass freely through zones, including their titles. Titles sit above connections with translucent backing, keeping crossing lines visible but subdued. Edge labels avoid nodes, titles, arrowheads, and other labels; displaced labels use a small leader to identify their connection. Exports preserve these appearances. Manual bend editing, layers, collaboration, and other Mermaid diagram types are deferred as specified in [SPEC.md](SPEC.md).

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
