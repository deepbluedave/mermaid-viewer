# Acceptance verification

UI and persistence revisions verified on 4–5 October 2026 against SPEC.md and EDITING-UI-SPEC.md, using the local Python HTTP server, Mermaid 12.0.0 and libavoid WASM. The following section records this revision; subsequent sections retain evidence from earlier revisions.

## Browser preferences and UI refinements

Verified on **5 October 2026**: **205 Node/model checks**, **30 browser/library/import/export checks**, **92 editor-handler checks**, and **33 file/clipboard/recent-file/description checks** — **360 passing automated checks**. [Results and screenshots](artifacts/refinements/README.md) record this revision. Syntax checks and `git diff --check` passed.

Autosave now persists in browser storage across New, Open, refresh and recovery while disconnected diagrams never write. Recent files reopen fresh disk content through controlled file handles, retain cancelled edits, omit invalid imports, deduplicate file identity, remove entries, and persist explicitly detached browser copies in actual IndexedDB. Concurrent transactions preserve entries created by different instances, and open menus refresh the latest history.

Description mode retains hierarchy/source labels, fits displayed text in all node shapes, reserves headers above children without moving them, supports empty descriptions, validates booleans, and survives project/clipboard roundtrips, Undo/Redo and SVG export. Existing editor and library regressions cover layout, route clearance, source merging and PNG/SVG exports. Menus retain their parent panels, support Left/Escape, close on a choice, and show decorative previews for all five shapes. Open and Save share the header and creation tools are Node, Zone, Connect.

Native browser review checked description typing/toggling, all shape previews, desktop Export flyouts, and bounded mobile menus with Open/Save icons. File-system access and permission branches use controlled handles; OS chooser dialogs and real retained file-handle persistence were not automated. Browser-copy persistence uses actual IndexedDB. Harness pages ran on localhost, separately from the user's 127.0.0.1 browser preferences and recent history.

## Working files, autosave and clipboard

The file/clipboard revision was verified on **4–5 October 2026**. It passes **199 Node/model/routing/file/clipboard checks**, **30 browser/library/import/export checks**, **91 existing app-handler checks** and **28 file/clipboard app-handler checks**: **348 automated checks**. Results and reviewed screenshots are in [artifacts/files-clipboard](artifacts/files-clipboard/README.md). Syntax checks and `git diff --check` also passed.

The production UI opens controlled JSON file handles and saves to their original contents without downloading. Tests delay write/close, continue typing during a write, and confirm that Saved only describes the completed snapshot. Optional one-second autosave includes focused Label, Description and Notes input without replacing fields or splitting Undo; Undo/Redo writes the corresponding models. Cancelled gestures and unconfirmed popup previews stay off disk. Completed moves save. First-session Undo remains available after autosave even when Open reset the previous history.

File lifecycle checks cover New/Open protection (including empty unapplied source drafts), Save and continue, picker cancellation, invalid imports, Save as success/failure, external conflicts and all three resolutions, lost permission with no timer prompt, manual retry, write failure and downloaded-copy fallback. Transitions wait for old writes, preserve bindings on failure and never write previous-document content into a new handle. A queued superseded automatic snapshot is skipped. Mermaid/example import creates a separate JSON working document. Browser recovery restores focused context and the separate source draft with no assumed file permission or autosave.

Clipboard checks cover single/multiple nodes, collapsed nested zones and parent nodes, internal versus boundary connections, fresh IDs and remapped parents/endpoints/attachment-order keys, complete contexts and explicit styles, destination theme/font inheritance, waypoints and label preferences, repeated/context-point paste, one Undo/Redo, autosave, malformed clipboard data, menu permission failures and ordinary text fields. Edge-only copies remain in their original open document. Delayed clipboard reads cannot modify a newly opened project. Offscreen paste reveals actual objects even when a very wide group's bounding-box centre is empty.

Native Cmd+C/V copied a three-node/two-zone/two-edge section and a five-node/four-edge selection, including a transfer into another editor tab. One Undo removed a complete paste and Redo restored it. Notes copied/pasted plain text without adding objects. Actual Download a copy produced a complete five-node/four-edge version 1 project. The production file controller then wrote that complete model to real disk files, preserved external changes and resumed only after explicit overwrite. Native 320px review retained 44px header targets and bounded File menus. Desktop and mobile screenshots are included.

**Verification limit:** the browser automation's HTML filechooser event does not expose native File System Access OS pickers or permission dialogues. Those direct-file API paths use controlled browser-harness handles, with real filesystem controller writes as additional evidence; no automated native OS grant is claimed. Native clipboard automation transports the browser's clipboard broker explicitly between tabs. Run an interactive supported-browser Open/Save/Autosave smoke check for the OS chooser/grant flow.

The earlier UI revision and evidence below remain historical records.

## Compact header, Properties and drag-to-connect

The current revision passes **168 Node/model/routing checks**, **30 browser/library/export checks**, **91 app-handler checks** and **22 native review checks**: **311 checks in total**. Current results are in [artifacts/ui-polish](artifacts/ui-polish/). The unit, browser and UI suites passed with the existing routing, waypoints, attachments, themes, containment, source and export coverage retained.

Desktop uses a single 56px header with File/View/Diagram, editing tools, history/deletion and Save. Selection actions sit in the sticky Properties heading; View can hide the panel while retaining header access to actions. Description and Notes follow Label for every object type. Width/Height and Fill/Text share rows, color resets appear only for overrides, and text areas grow without replacing focused fields. Responsive checks cover 320, 390, 600, 850, 1024, 1280 and 1800 pixels. Narrow screens use two header rows, a tool chooser, Selection actions, Properties and 44px command targets.

Connection coverage presses node, zone and parent-node bodies, verifies preview/target highlighting and waits for release before committing. Node/node, node/zone, zone/parent and parent/node combinations preserve positions and use existing routing. Click-to-click, contextual Connect, parallel connections, self-loops and handle reconnect remain covered. Empty drops, Escape, capture loss and a second touch create no edit; long-press retains object menus. Touch checks use synthetic events in the real app-handler harness; native mouse checks complement those at narrow widths. No physical mobile device was used for this revision.

Native review used the editable request-workflow project through actual File/Open, Save downloads, toolbar/menu controls and mouse/keyboard input. A node-body drag created a parallel connection and returned to Select; one Undo restored exact routes and Redo restored the edge. An empty drop left Connect armed. A zone-body drag created a correctly directed zone/zone route. Description typing retained focus and expanded the field to 99px; Undo restored the whole session. Shape changes, custom-only color resets, menu toggling and keyboard submenu return were verified. Narrow native review used 390 × 660 and 320 × 660 embedded app viewports; the notes field refitted to 105px when Properties opened, Close returned focus, and theme/menu controls stayed within bounds.

The live review found and fixed two regressions: submenu arrow keys could also reach canvas nudge shortcuts, and saved context was sized while a mobile sheet was hidden. The UI suite now verifies unchanged geometry and an unchanged Undo boundary through menu navigation, content fitting after opening hidden sheets, and Ctrl/Cmd+S inside menus and editors. Save commits a valid preview once, while invalid drafts remain editable and prevent downloading. Standalone desktop and responsive-review consoles contained no warnings or errors.

Actual Save/Open/Save restored the complete project, including geometry, context, settings and view. File-menu SVG and PNG exports contain the five-node/four-route diagram without editor handles; the PNG was visually reviewed at 1946 × 766. Evidence includes [desktop Properties](artifacts/ui-polish/desktop-properties.jpg), [File menu](artifacts/ui-polish/file-menu.jpg), [mobile Properties](artifacts/ui-polish/mobile-properties.jpg), [320px theme chooser](artifacts/ui-polish/mobile-theme-menu.jpg), [editable saved project](artifacts/ui-polish/native-saved.mermaid-project.json), [SVG](artifacts/ui-polish/request-workflow.svg), [PNG](artifacts/ui-polish/request-workflow.png) and [native results](artifacts/ui-polish/native-results.json).

## Editing controls

The controls revision passes **155 Node checks**, **30 browser checks**, **80 UI handler checks**, **23 native zone scenarios**, **18 native attachment scenarios**, and **23 new native controls scenarios**: **329 checks in total**.

The new native session builds a Floating Orchard supply diagram through the UI. It creates seven nodes in all five shapes, three stages, a nested weather zone, eight connections, solid/dotted parallel paths, and a self-loop. It uses the selection bar, More, popup editors, attachment tabs, file pickers, downloads, and keyboard menus. Save/Open, source edits, Auto layout/Undo, and all export formats retain the appropriate diagram preferences.

Checks cover captured creation coordinates at 25%, 100%, and 200% zoom; group and part menu targeting; attachment sides/order/reset; reconnect drag/cancellation; nested fitting and padding; root-aware alignment; label/color previews; Apply/click-away/Cancel; invalid values blocking actions and saves; leader lines; named deletion and Undo; stable bars; all menu corners; narrow-screen overflow and touch target sizes; and Properties sheets. Native Chrome touch input tests taps, long-presses on nodes, labels, waypoints, attachments and blank canvas, drags, a second touch, and placement mode. No browser script errors were recorded.

Testing found and resolved a draw error for selected connections, a click-away commit that replaced the hierarchy before the original click completed, and routine redraws closing open menus. Touch presses now wait for release, drag, or long-press before acting, so a placement tool cannot create an unwanted object first. Attachment popovers sit outside their node's selected side when space permits. Mobile controls keep a stable bar and suppress the browser tap flash over open menus.

Run `DIAGRAM_URL=http://127.0.0.1:8000 node tests/native-controls.cjs` with Playwright and Chromium available. Evidence: [native controls](artifacts/controls/results.json), [browser checks](artifacts/controls/browser-results.json), [UI checks](artifacts/controls/ui-results.json), [Node checks](artifacts/controls/unit-results.txt), [editable orchard](artifacts/controls/floating-orchard.mermaid-project.json), [desktop controls](artifacts/controls/desktop-attachments.png), [mobile controls](artifacts/controls/mobile.png), and [mobile menu](artifacts/controls/mobile-menu.png).

## Automated results

- `npm test`: **123/123 passed** (model, native routing engine, label placement, local-asset/licence checks, and exact release binary/source-package provenance). Nested zones and title bands leave routes unchanged; contained nodes remain obstacles and zone endpoints remain attached after moving. Parallel attachments stay separate on all five shape outlines; straight connections stay outside their endpoint interiors; crowded sides and resize retain distinct pins. Long, short-link, multiline, crossing, and self-loop labels are checked without changing routes or geometry. Manual label tests cover exact overlap, leader thresholds, route rotation, small rerouting jogs, automatic avoidance, reset, and persistence. Join repair coverage includes all shapes/sides, precision, atomic fallback, candidate errors, long detours, intentional reversals, and bridge rendering at straight-through waypoints.
- `tests/browser.html`: **30/30 passed** (Mermaid imports, shape/style/direction round-tripping, quoted/entity/Unicode/multiline/empty labels, unsupported features, both layouts, standalone SVG/PNG rendering, model serialization). A rasterized export verifies a crossing line is subdued but still visible beneath a title. Parallel long labels remain separate and included in exported image bounds, with leaders identifying displaced labels. Manual labels survive source/layout changes and standalone SVG/PNG export. The lunar dispatch repair, radar crossing bridge, and label/leader geometry survive standalone SVG/PNG.
- `tests/ui.html`: **80/80 passed** (real app event handlers for creation, properties, membership, alignment/distribution, history, source drafts/application, layouts, gesture cancellation, project open/save, connections, and all exports). New, pending label commits, creation inside nested zones, fresh-source fitting, and world-coordinate grid dots are covered. Opened saved projects start clean. Parallel arrow tips and reconnect handles remain separate after node movement, shape changes, and Undo. Manual label gestures, nudges, grid, cancellation, reset, leaders, and overlap hit priority are covered. Repaired joins remain stable through movement, redraws, undo/redo, label edits, save/reopen, and exports.

The structural revision additionally checks click-to-connect and contextual cursors/handles, node and zone drop parenting, visible property-based placement, minimum spacing during editing and both layouts, legacy crowded-project recovery, hierarchy selection/collapse, descriptions/notes persistence, and crossing bridges in standalone exports.

Latest machine-readable browser results are in `artifacts/attachment-order-browser-results.json` and `artifacts/attachment-order-ui-results.json`. Earlier appearance results remain in their historical files. The UI harness suppresses repeated OS downloads and substitutes capture for synthetic pointer events. Those checks are complemented by native mouse and file-picker checks below; the harness does not replace testing the native gestures.

## Attachment ordering and manual choice

The attachment revision passes **123 Node tests**, **30 browser checks**, **80 UI handler checks**, and **48 native scenarios**: the 17 waypoint and 13 label scenarios were rerun, alongside 18 new native attachment scenarios. The 14 attachment unit tests include matrices across every shape and side, incoming/outgoing/straight ends, crowded pins, zones, parent nodes, same-side loop ends, subpixel movement, history, inactive sides, new connections, removal/reconnection, malformed project data, candidate failures, and a five-group fixture that proves the four-trial budget and cached redraw behavior.

Opening the unchanged lunar project automatically places the radar connection below dispatch. Its nearby crossing disappears with all original diagram geometry, waypoint coordinates and label preferences retained. Reordering the side manually overrides scoring; Reset returns to the clean automatic stack. Native drags preserve the settled order during movement and recompute on release. Source/target properties expose the same shared preference. Disabled boundary/reset buttons stay correct after project open.

The native scenarios use actual mouse input, file selection, Save downloads, SVG/PNG downloads and reopening. They also build a subsea observatory through the UI in all five shapes, move its containing zone, exercise manual order on all four sides, and create parent-node connections and a same-side self-loop. Adding a peer appends it after the saved stack; deleting/reconnecting an end prunes its reference and Undo restores the preference. Labels still follow routes, remain draggable, and retain their leaders.

Two routing issues were resolved during testing. A newly lower source pin could retrace into its first waypoint; a guarded perpendicular native arrival removes that reversal without moving the point. Strict per-edge length comparison could reject the same good swap after minute pointer rounding; acceptance now compares avoidable detour through fixed points and the combined route length, allowing necessary alignment while rejecting added detours. Moving Launch drones down by 18 units exposes a real ambiguity: a pin swap trades the crossing for an overlap, so automatic scoring retains the baseline. A native test then manually chooses the lower radar attachment and adjusts its first waypoint to 208, producing separate paths with no retrace. The feature preserves that explicit choice.

For the final presentation, the clean lower radar order is saved manually and its first waypoint is aligned with its pin at approximately `(720, 196)` through the UI. This diagram edit removes the remaining small alignment step. Other waypoint coordinates, nodes, zones, labels and leaders are preserved. The original lunar fixture remains unchanged.

Evidence: [unit checks](artifacts/attachment-order-unit-results.txt), [browser checks](artifacts/attachment-order-browser-results.json), [UI checks](artifacts/attachment-order-ui-results.json), [native attachment checks](artifacts/attachment-order-native-results.json), [waypoint checks](artifacts/attachment-order-f1-native-results.json), [label checks](artifacts/attachment-order-f2-native-results.json), [editable project](artifacts/attachment-order-lunar.mermaid-project.json), [finished diagram](artifacts/attachment-order-lunar.png), [attachment close-up](artifacts/attachment-order-launch-detail.png), and [manual controls](artifacts/attachment-order-controls.png). Run the repeatable native checks with Playwright and Chromium available: `DIAGRAM_URL=http://127.0.0.1:8000 node tests/native-attachments.cjs`.

## Waypoint join repair (prior revision)

The 3 October revision passes **109 Node tests**, **28 browser regression checks**, **75 UI handler checks**, and **40 native scenarios**: the existing 17 waypoint and 13 label scenarios, plus 10 focused join-repair scenarios.

The saved lunar project reproduces the defect with fixed waypoint `(620, 190)` and west attachment at `y=196`. The accepted route turns horizontally at the waypoint and steps down later; it retains both waypoint coordinates, all node/zone geometry, label preferences, terminal directions, route length, and unrelated native paths. Repairs use one additional native transaction at most. A failed/longer candidate retains the entire baseline; there is no repeated refinement or mixed transaction output.

Regression matrices cover all five shapes, all four forced target sides, movement across alignment, crowded pins, leaf obstacles, container interiors, self-loops, coincident/explicitly reversed waypoints, blocked-point recovery, edge reordering, repeated identical input, candidate errors, and atomic fallback when one candidate requires a long detour. Native pointer testing exposed an almost-zero offset on a second connection vetoing the dispatch correction; detection now ignores segments within the numerical tolerance, with positive/negative fractional movement regressions. A 200-node/400-connection stress fixture retains identical repeated output and one transaction when no join qualifies.

Native focused checks open the unchanged lunar project; drag its target across alignment and back; change/undo a forced side; move/undo the lunar zone; drag/nudge/undo the dispatch label; repeat style-triggered reroutes; save/reopen and export SVG/PNG; create a new corridor through real controls; add/delete/undo a wall that requires fallback; and create an explicit reversal alongside an accidental terminal spur. Leader lines and manual preferences remain intact.

Visual review found that the new crossing fell exactly on a straight-through radar waypoint, hiding its bridge. Bridge drawing now treats the forward collinear run as one segment, without changing raw routes or waypoint data. Tests verify that actual corners, reversals, and shared endpoints retain their behavior and the radar bridge appears in exported images.

Evidence: [browser checks](artifacts/routing-join-browser-results.json), [UI checks](artifacts/routing-join-ui-results.json), [focused native checks](artifacts/routing-join-native-results.json), [waypoint native checks](artifacts/routing-join-f1-native-results.json), [label native checks](artifacts/routing-join-f2-native-results.json), [editable lunar project](artifacts/routing-join-lunar.mermaid-project.json), and [finished screenshot](artifacts/routing-join-lunar.png).

## F2 manual connection labels

The 3 October revision passes **97 Node tests**, **27 browser regression checks**, **73 UI handler checks**, and **13 native mouse scenarios** in Chromium at 1800 × 1200. Native scenarios create nodes, zones, connections, and waypoints through editor controls and inspect actual Save downloads.

Coverage includes off-centre label dragging, unchanged route geometry, undo/redo, leader appearance/removal, exact manual overlaps, automatic labels avoiding manual boxes, single/joint endpoint moves, route rotation, straight diagonal paths, multiline and empty/restored text, waypoint edits, snapping, arrow nudges, zoom, Escape, nested-zone movement, self-loops, Auto layout, source edits, native save/reopen, SVG/PNG export, and reversible reset.

Testing found and fixed three interaction problems: segment plus handles could cover draggable labels; overlapping manual labels could intercept selected-node drags; and a short orthogonal jog could rotate a label's offset by 90 degrees. Segment controls now find a clear position, selected overlapping objects receive pointer gestures, and the route direction is sampled across nearby segments. Automatic collision placement and its dotted leaders remain intact.

The finished lunar rescue scenario was built entirely through the UI: nine nodes of all five shapes, two colored zones, twelve manually placed labels, forced attachment sides, two parallel connections, and waypoint routes for scanning, weather waiting, dispatch, and mission debrief. A final node nudge/undo and SVG/PNG downloads verify the arrangement remains editable and exportable.

Evidence: [browser checks](artifacts/f2-browser-results.json), [UI checks](artifacts/f2-ui-results.json), [native scenarios](artifacts/f2-native-results.json), [editable lunar rescue](artifacts/f2-lunar-rescue.mermaid-project.json), and [finished screenshot](artifacts/f2-lunar-rescue.png).

## F1 manual waypoints

The 3 October revision passes **89 Node tests**, **25 browser regression checks**, **65 UI handler checks**, and **17 native mouse scenarios** in Chromium at 1800 × 1200. Native scenarios build nodes, connections, zones, and a node container through the actual editor controls; project state is inspected through real Save downloads, rather than injected into the running editor.

Coverage includes all five node shapes and all four forced source sides, single and joint endpoint moves, keyboard nudging, resizing, segment dragging, waypoint dragging, grid snapping, cancellation, nested zones, zone endpoints, container/child selection, parallel routes, self-loops, endpoint reconnection, Auto layout, save/reopen, route reset, and SVG/PNG export. Synthetic UI checks additionally cover capture loss, constant screen handle sizes across zoom levels, whole-edge versus point deletion, explicit reset before Straight, and matching-ID source preservation.

Two native interaction regressions were found and fixed: Node/Zone placement now takes precedence over route handles, and a conflict marker on an unselected edge cannot intercept dragging its blocking node. Routing tests also cover doubled-back and coincident waypoints: manual spans use fixed libavoid point endpoints so native checkpoint simplification cannot erase a waypoint.

A covered waypoint remains in the saved project, is marked red, and is temporarily skipped by the router until uncovered. Forced attachment sides remain independent of manual points. Both-end movement translates points once by the final accepted delta; one-end movement, resize, and Auto layout retain fixed coordinates.

Current results: [Node/browser coverage](artifacts/f1-browser-results.json), [UI coverage](artifacts/f1-ui-results.json), and [native scenarios](artifacts/f1-native-results.json). The [editable example](artifacts/f1-example.mermaid-project.json) routes “Next iteration” outside Delivery using three waypoints; [finished screenshot](artifacts/f1-example.png) and [route controls](artifacts/f1-editing.png) show the actual UI.

## Native interaction checks

- Dragged Core API at 30%, 47%, and 73% zoom. A 20-pixel horizontal / 15-pixel vertical drag produced the corresponding diagram-unit delta at each scale. Canvas translation/scale did not change. Undo restored each complete drag.
- Selected a public zone and its directly selected child, then dragged the zone header. The nested zone and all three nodes moved once; unrelated nodes and canvas view stayed fixed. Undo restored them.
- Created an edge by dragging the CDN's handle onto Core API, then dragged its target endpoint onto Background Worker. The model and properties reflected the new endpoints.
- Resized the public zone through its corner handle. The zone grew; contained node coordinates did not change.
- Shift-dragged a selection box from empty space inside the DMZ. Both enclosed nodes were selected.
- Used Pan and wheel zoom. The canvas view changed while node coordinates stayed fixed.
- Saved an edited project through the actual Save project button, inspected its downloaded JSON, and reopened it through Open's native file picker. The Core API coordinates `(598.2314171424277, 1112.4361853966345)` and saved canvas view were restored without automatic layout. A copy of this test output is `artifacts/native-open-project.json`.

Native gesture measurements are in `artifacts/native-results.json`.

After making zones fully traversable, a native 25-pixel horizontal / 15-pixel vertical drag on the public zone's title overlay at 30% zoom moved the zone and its children by the corresponding diagram-unit delta. The external worker and canvas view remained fixed, and Undo restored the original geometry. This follow-up is recorded in `artifacts/zone-title-native-results.json`.

After separating connection pins, three parallel edges between a rectangle and a database cylinder were visually checked at 125% zoom. A native 40-pixel horizontal / 100-pixel vertical drag moved the destination by 32 / 80 diagram units. All routes remained orthogonal with separate source and target attachments, and Undo restored the nodes and routes. Measurements are in `artifacts/edge-spacing-native-results.json` and the preview is `artifacts/edge-spacing-preview.jpg`.

## Review from a fresh diagram

Started with a small Mermaid diagram, then used New and the actual toolbar to build three nodes, nested Application/Request handling zones, a grouped Data services zone, two parallel labeled connections, a worker connection, and a self-loop. The review reproduced and fixed:

- A fresh small source retaining the previous diagram's tiny zoom.
- Property label typing lost when clicking the canvas or another tool, including native keyboard typing.
- Newly created nodes and zones appearing inside zones without belonging to them.
- Grid dots remaining fixed to the screen while snapping used diagram coordinates.
- Parallel long edge labels overlapping and obscuring each other.
- Controls accepting input before the local engines finished starting.
- An opened saved project incorrectly displaying Unsaved changes.

Native follow-up checks changed the request node to a circle and undid it, dragged it with snapping at 126% zoom, moved the outer zone, resized it, and undid each move/resize. Descendants moved once; unrelated nodes and the view stayed fixed; routes remained orthogonal. Saved the diagram through the actual Save button, cleared the canvas through New, and reopened the downloaded project through Open's file chooser. Geometry, routes, and view matched exactly. The standalone editor console was clear.

Evidence: `artifacts/review-native-results.json`, `artifacts/review-native-verification.json`, `artifacts/review-project.mermaid-project.json`, and `artifacts/review-editor-preview.jpg`. A separate three-parallel-edge fixture shows the label improvement in `artifacts/review-labels-before.jpg` and `artifacts/review-labels-after.jpg`. Latest automated results are also retained in `artifacts/review-browser-results.json` and `artifacts/review-ui-results.json`.

## Requirement coverage

| Requirement in SPEC.md | Evidence |
| --- | --- |
| Mermaid starting point; canonical evolving model; stable IDs and generated source | `core.mjs` model/serializer; browser round-trip tests; UI source/property tests |
| Explicit Apply/Discard; retain drafts and invalid/unsupported-source errors | UI draft, source-apply, and layout/history tests; adapter unsupported-feature tests |
| Match IDs to retained manual centres; position new objects; remove deleted objects | Browser `mergeSource` test; UI source evolution and deletion tests |
| Select/Shift-select, box selection, move selection/zone, zoom-correct movement, nudge/snap, Pan/Fit/Escape | Native gesture results; model union-of-descendants tests; UI alignment/grid/cancel tests; `app.mjs` Fit uses current scene bounds |
| Add/edit/delete nodes; five shapes; label sizing; retain IDs/membership/connections | UI shape/property tests; browser five-shape round-trip; model sizing/deletion tests |
| Nested zone create/rename/move/resize/expand/drop/reparent | Native node/zone adoption and release; UI drop-target/Undo/property tests; model cycle and spacing tests |
| Zone removal retains contents; dragging updates containment; Group/Ungroup removed | Model deletion/reparent/drop tests; UI command-absence, hierarchy and zone-removal checks |
| Create/edit/reconnect/delete edges; all directions and styles; parallel edges and loops | Native handle tests; UI edge-handler tests; browser style/ID round-trip and native routing tests |
| Orthogonal rerouting around nodes; traversable nested zones and titles; straight edges; correct shape pins | libavoid routing tests, including obstacle movement, zone/title traversal, zone endpoints, self-loops, parallel routes and actual shape-outline pins |
| Titles above connections, crossing lines subdued but visible, same appearance in exports | Browser layer-order and rasterized-image checks; UI computed-opacity and title-drag/Undo checks; native title drag |
| Separate connections sharing a side; correct arrowheads and route-following edge labels | 12-unit pin/route spacing, with pin spacing reduced on crowded sides; node-shape outline and straight-segment tests; SVG `auto-start-reverse` marker; UI reconnection-handle checks; native parallel-edge preview and drag |
| Common toolbar/properties and keyboard-accessible controls | Native buttons/selects/labelled fields in viewer.html; native UI operation; handlers and shortcuts in app.mjs |
| Mermaid/ELK initial/explicit adaptive and hierarchical layouts, current structure only | Browser architecture/layout tests; UI explicit Auto layout after additions; libavoid is the sole route-finding engine |
| Atomic undo/redo, cancelled/invalid actions excluded, navigation excluded | Model History tests; native whole-drag Undo; UI structural/layout/nudge Undo/Redo and gesture cancellation; cancellation/error handlers do not record history |
| Versioned full project restore without relayout | Exact-model UI save/open test and native downloaded-project reopen |
| Valid evolved Mermaid; complete standalone SVG/PNG arrangement without controls | Browser round-trip/export tests; UI all-export blob/signature tests; exports derive bounds from the current scene |
| Local operation without CDN/services/accounts; locally shipped licences and sources | Asset graph/CSP checks; UI runtime resource origins and external-fetch rejection; vendor licence/source checks and bundled archives |
| Deferred features remain deferred | No bend editor, layers, collaboration, or editing adapters for other diagram types |

## Test-browser console control

The in-app browser emits a MutationObserver message when it loads an iframe. The same message was reproduced by `frame-control.html`, whose parent and child contain only static HTML and load no application or library scripts. The standalone editor console was clear. The control observation is saved in `artifacts/console-control.json`; this distinguishes that browser instrumentation message from application errors.

## Scope and reproducibility

Supported diagram features are those in SPEC.md. Custom styles, callbacks, advanced shapes/assets, Markdown formatting, accessibility metadata, and other unsupported semantics fail explicitly instead of being discarded. The application uses a consistent appearance. The supplied project limits are 500 objects and 1,000 connections. Tests cover the supplied examples and focused edge cases; they do not claim every possible Mermaid source or every browser/device has been exercised.

Run the commands and local test pages described in README.md to reproduce automated results. Native gesture measurements were recorded during manual browser automation and are evidence from that run.

## Structural editing revision

Built two diagrams from New using native toolbar actions, without automatic layout:

- Order processing: five nodes, a nested fulfilment zone, six connections, three visible crossing bridges, a self-loop, and context fields on both a node and a zone.
- Research pipeline: four nodes including a decision and database cylinder, two zones, and four flows including an evaluation loop. Dragging the research zone into Release review created a nested hierarchy while retaining all descendants and keeping the moved border clear of unrelated nodes.

Native drops moved the event queue into Fulfilment and back to the top level, with Undo restoring membership. Dragging Fulfilment out released its parent and retained its worker. A property-based parent change visibly moved Order API from `(80,136)` to `(119,349)`; Undo restored both its old parent and coordinates. Reopened the nested research project through the native file chooser and verified its parent, description, notes, and clean save indicator. The order model was exported through the actual SVG and PNG buttons: the SVG includes three bridges and the PNG is 1259 × 806 pixels.

Artifacts:

- `artifacts/order-processing.mermaid-project.json`, `order-processing-preview.jpg`, `order-processing.svg`, and `order-processing.png`.
- `artifacts/research-pipeline.mermaid-project.json` and `research-pipeline-preview.jpg` show the model before nesting; `research-pipeline-nested.mermaid-project.json` and `research-pipeline-nested-preview.jpg` show the revised containment.
- `artifacts/structure-native-results.json` records native parenting, Undo, property placement, and recovery checks.
- `artifacts/structure-browser-results.json` and `structure-ui-results.json` retain the final automated results.

The revision removes Group/Ungroup from the interface. Legacy internal grouping helpers still have model regression coverage, but are not user commands. Diagrams keep a minimum 24-unit node gap; a dragged zone also stays clear of stationary unrelated nodes. The intended destination is chosen before collision correction, so spacing cannot inadvertently change a requested parent. Old crowded project files are corrected on open and marked for saving; correctly spaced saved projects retain their exact arrangement. Descriptions and notes are stored in project files and retained through matching-ID source edits and automatic layout; they are not encoded in Mermaid or image exports.

## Resizing, guides, context, and appearance revision

That revision passed **102 checks**: 48 Node tests, 16 browser/library/export tests, and 38 app-handler acceptance tests. New coverage includes every resized shape, opposite anchors, circle proportions, tiny label-fit limits, multilingual text, neighbour clearance, manual wrapping, child-preserving zone resize, guide comparisons/tolerance, version-1 compatibility, and invalid color/font/size/context fields. App checks cover cancellation, atomic Undo/Redo, constant eight-pixel resize targets, guide toggle/clearing/export exclusion, color swatch synchronization, edge context, source/layout persistence, 48px text, saved geometry, and standalone color/font rendering.

Native review used two fresh diagrams:

- **Incident response** was imported from new Mermaid with all five shapes, two zones, and five edges. A native 42px/25px southeast resize at 49% zoom grew Contact responder from 310 × 105 to approximately 396.160 × 156.286 diagram units while keeping its upper-left anchor, other nodes, and view fixed. Undo restored the complete gesture; Redo reapplied it. A northwest circle resize retained equal dimensions and the opposite corner. Applied node/zone colors, typed edge description/notes, changed 24px text to 28px without changing the view, reapplied source, saved, cleared through New, and reopened with exact geometry/view and edge context.
- **Workshop agenda** was built from New through native Zone/Node/Connect actions with 32px text, a dark zone/light title, a rounded multilingual node, and a circle with emoji. Native dragging brought the node left sides within 0.454 diagram units, within the guide tolerance. Increasing to 48px preserved the view before explicitly choosing Fit. A height request of 1 was constrained to the 93-unit label minimum; Undo restored the chosen 110-unit height. Saved and reopened the project with font size, manual width, colors, and edge notes intact.

The native review found and fixed a hierarchy click-away timing bug: committing a field could detach the connection button under the pointer before its click. Panel rebuilding is now suspended during that commit and the hierarchy refresh follows the click. A regression checks that the button and next property input remain connected, the intended edge is selected, and notes are saved on that edge. Standalone editor consoles were clear.

Both diagrams were exported through the actual SVG and PNG controls; their PNGs were visually reviewed. Colors, all diagram text sizes, title opacity, and complete label bounds survive export. Handles and alignment guides are absent. Evidence is in `artifacts/appearance-native-results.json`, `incident-response.mermaid-project.json`, `incident-response-preview.jpg`, `incident-response.svg`, `incident-response.png`, and the corresponding `workshop-agenda` project/preview/SVG/PNG files. Previous native checks above document earlier revisions.


## Live previews and node containment revision

The preceding refinement run passed **127 automated checks**: 61 Node/model/routing tests, 21 browser/library/export tests, and 45 app-handler acceptance tests. The final standalone editor consoles contain no warnings or errors. New cases cover:

- Immediate node, edge, and zone labels while the field stays focused; one Undo for a continuous session; generated source updated before blur.
- Continuous color `input` previews reaching the actual SVG/computed fill; the original picker remains connected, hex values follow it, descendants track parent colors, and invalid final hex rolls back. Explicit child colors remain overrides. This run verified native hex-field previews and browser picker events; the macOS color panel itself is outside browser screenshots and Computer Use disallows controlling Codex, so its internal slider was not sampled.
- Stronger dark purple guides with constant screen weight, darker selected-color title bars, derived child-zone shades, and stronger dotted label leaders retained in standalone exports.
- Circle/diamond “New Node” wrapping and unwrapping; actual outline fit using browser-measured text, multilingual labels, long words, empty labels, varied aspect ratios, and 10–48px fonts.
- Parent nodes in all five shapes, including empty parents, nested parent nodes, and zones inside nodes. Creating, choosing parents, dropping, moving descendants once, preserving children on resize/delete/disable, cycle rejection, parent connections/self-loops, context/colors, source annotations, both layouts, and exact project restore are covered.
- Both layout engines in LR/RL/TD/BT leave at least 24 units between unrelated root objects after zone/title/shape expansion.

Native checks used an imported Notification delivery diagram and a Review pipeline built from New through toolbar actions. The imported parent title drag moved its body and both children by 40px/20px while leaving Client fixed; Undo restored the move. Native label and hex typing changed the title/fill before leaving the property field. Creating a child in an enabled node placed it in that parent. Dropping out released it and respected the former parent body's gap; dropping back in retained its requested centre and the parent's 320-unit width. This check caught and fixed an ordering bug where collision correction treated the intended parent body as an obstacle before adoption. Circle labels wrapped at 90 and unwrapped at 240; diamond labels wrapped at 100 × 180 and unwrapped at width 300.

The supplied LR example now gives Customer Browser approximately 136.668 diagram units of clearance from the expanded Public Edge zone in this run. Its nested zones derive darker backgrounds and headers from their parents. Notification delivery was saved, exported through the actual SVG/PNG controls, and reopened through the native file chooser. Re-saving produced an identical complete model, including the parent flag, membership, 16px text, colors, geometry, and view. The exported PNG was visually reviewed: the rounded parent title stays inside its outline, edges remain visible above its body, child shapes/labels are readable, and control handles are absent.

Evidence: `artifacts/refinement-native-results.json`, `refinement-notification-service.mermaid-project.json`, `refinement-notification-service.svg`, `refinement-notification-service.png`, `refinement-parent-node.jpg`, `refinement-review-pipeline.mermaid-project.json`, and `refinement-zones-lr.jpg`. Parent nodes use Mermaid subgraphs plus reserved shape comments in source; ordinary Mermaid renders those subgraphs, while this editor restores the original parent-node shape. Project files retain the exact appearance and arrangement.


## Drag adoption and toolbar placement revision

The preceding run passed **141 automated checks**: 68 model/routing tests, 21 browser/library/export tests, and 52 app-handler tests. Nine native interaction checks also pass on the local 1280 × 720 browser. The standalone editor console contains no warnings or errors.

Dragging an existing node or zone onto an ordinary node now creates containment on the visible shape outline, choosing the deepest eligible target and rejecting self/descendant cycles. Preview membership is applied before collision correction so the child stays at its intended centre. When a parent's final child leaves or is deleted, it returns to an ordinary node; its ID, shape, colors, context, parent and incident edges remain. Original manual dimensions are retained in optional version-1 `containerSize` data, preserved through matching-ID source edits and Save/Open, then restored on demotion. Explicit empty container nodes remain available until they have children that leave. Empty zones are retained.

Node and Zone toolbar buttons now support drag placement as well as click placement. A translucent ghost and destination highlight appear on the canvas. Release creates one object and returns to Select. Escape, lost capture or releasing outside the canvas cancels without recording an edit. Actual shape sizing precedes snapping so large-font placement stays consistent with its preview. Tests cover all five target shapes, curved-outline corner exclusions, nested containers, transfer between parents, multi-child retention, manual-size/context/edge preservation, Undo/Redo, both placement controls, ordinary-node/zone destinations, different zoom/pan/grid/font settings, invalid destinations, pending property edits, and ghost-free exports.

Native review built Delivery service and Prepare parcel by dragging Node from the toolbar. Dropping Prepare parcel onto the ordinary rounded Delivery service promoted it while retaining the child's screen centre. Dragging its last child out demoted Delivery service; Undo restored both membership and parent type. Dragged Zone to a chosen centre, undid it, and released Node in Properties to verify cancellation. On the final build, placed Courier with another toolbar drag, connected Prepare parcel to it, then transferred the child to Courier: Courier became a parent, Delivery service returned to an ordinary node, and the connection remained. Undo restored the prior arrangement. Dragged another Zone onto the canvas, then moved Delivery service into it; both descendants moved by 345px/220px while Courier stayed fixed. Saved the completed diagram with its connection and nested zone/node hierarchy.

Evidence: `artifacts/drag-native-results.json`, `drag-node-parent.mermaid-project.json`, `drag-zone-node-editor.mermaid-project.json`, and `drag-editor-preview.jpg`. Latest browser/app results remain in `artifacts/browser-results.json` and `artifacts/ui-results.json`.


## Zone body dragging and one-connection mode revision

The preceding run passed **144 automated checks**: 68 model/routing tests, 21 browser/library/export tests, and 55 app-handler tests. Eight native interaction checks pass; the standalone editor console has no warnings or errors.

Zone bodies now use the same selection and drag behavior as nodes. Native dragging of the selected Fulfilment zone body moved its nested Delivery service parent and Prepare parcel child by exactly 40px/20px, with Courier and the view fixed. A single Undo restored all geometry; Redo reapplied the whole move. Dragging Prepare parcel independently moved only that child. App-handler checks also cover a selected ancestor and child moving once, first-drag selection from an unselected zone body, Escape cancellation without a history entry, and Shift-marquee selection inside zones. Title dragging remains covered by the existing acceptance cases.

Each successfully created connection returns to Select with the new edge selected. Native source/target clicks and handle dragging both verify this behavior. Subsequent ordinary node clicks select without creating another edge. An invalid native handle drop creates no edge, removes its preview, and leaves Connect active. App-handler checks cover explicit rearming for parallel edges and self-loops, incomplete source selection, invalid targets, retrying a valid handle drop, and reattachment remaining in Select.

The preceding completed improvements were committed as `419a0c4` before this revision. Evidence: `artifacts/interaction-polish-native-results.json`, `interaction-polish-preview.jpg`, and the latest `browser-results.json` / `ui-results.json`.


## Directional container border connections revision

The preceding run passed **153 automated checks**: 75 model/routing tests, 22 browser/library/export tests, and 56 app-handler tests. Seven native mouse checks pass, with no warnings or errors in the standalone editor console.

Zone and parent-node endpoints now use native libavoid directional pins. Small anchors represent only the connected outline ports; container bodies and titles are not registered as obstacles. This prevents arrows ending tangentially along a zone border. External endpoints approach from outside; endpoints connected to contained objects approach from inside. Libavoid finds and separates the complete routes. The shipped routing library remains unmodified.

Regression cases cover the supplied offset zone-to-zone geometry, moving either endpoint across horizontal/vertical arrangements, every combination of four explicit sides for node/zone connections, ordinary leaf obstacles, movement/resizing, all five parent-node shapes, inward approaches in nested zones, self-loops, distinct parallel and bidirectional attachments, and unrelated routes passing through connected zone bodies/title bands. Browser checks verify the exported arrow follows the final segment, border endpoints survive standalone SVG, and PNG rendering succeeds. App-handler checks create zone-to-zone and node-to-zone edges, drag the target zone, change its attachment to Top, and undo the edit.

Native review created an offset Source zone → Target zone connection and Worker → Target zone connection through source/target clicks. Both arrows enter the target's left border horizontally at distinct points. A 25px/50px zone body drag rerouted both correctly, with Worker and the view fixed; one Undo restored exact routes and geometry. Width/Height edits retained correct border approaches. Choosing Top made the Worker arrow point downward into the top border. Dropping a native Worker left handle onto the target zone honored the node departure and zone approach, then returned to Select. The extra edge was undone and the completed two-edge diagram was saved.

Evidence: `artifacts/zone-border-native-results.json`, `zone-border-routing.mermaid-project.json`, `zone-border-preview.jpg`, and the latest `browser-results.json` / `ui-results.json`.


## Whole-word label wrapping revision

The latest run passes **159 automated checks**: 79 model/routing tests, 23 browser/library/export tests, and 57 app-handler tests. Seven native UI checks pass; the standalone editor console has no warnings or errors.

Automatic wrapping now breaks only at whitespace and retains explicit newlines. Words, identifiers, unspaced Unicode text, combining sequences and joined emoji stay intact. Shapes and parent-title minimum widths grow to fit a whole word rather than splitting it into fragments. Browser-measured checks cover all five shapes, circle/diamond outline fit and standalone SVG/PNG output. Opening an older project grows undersized geometry while retaining centres, manual size preferences, context, existing extra room and valid unrelated geometry; repeated opening is stable.

Native review opened a Customer Browser circle connected to CDN over HTTPS. Its 20px label renders as whole Customer and Browser lines. Requesting Width 90 was constrained to about 143 units, keeping the words inside the circle. Width 300 unwrapped the label to one line; one Undo restored the wrapped circle and route. Typing CustomerBrowserIdentifier immediately grew the circle and kept the identifier whole. Increasing the diagram text size to 28px retained whole words and fitted the shape; Undo restored the prior font and geometry. The actual Save button and native file-picker reopen preserved exact circle bounds and connection route, with no unsaved adjustment.

Evidence: `artifacts/whole-word-native-results.json`, `whole-word-labels.mermaid-project.json`, `whole-word-preview.jpg`, and the latest `browser-results.json` / `ui-results.json`.

## Zone alignment, fitting and padding (F4 / F5)

The latest run passes 155 model/routing checks, 30 browser/library/export checks, and 80 app-handler checks. The native zone script passes 23 scenarios; the existing 18 native attachment scenarios also pass.

Zone alignment translates each selected root and its descendants as a rigid group. Clearance operates along the other axis, preserving alignment or distribution gaps and stationary objects. Tests cover every alignment, both distributions, sibling nesting, selected ancestors/descendants, node containers, blocked destinations, whole-action undo, and final-delta waypoint movement. A fractional-coordinate regression prevents expansion checks from introducing tiny size changes after a group moves.

Fit changes only selected zone frames, processes selected nested zones from deepest to outermost, and respects unselected nested manual sizes. Per-side padding defaults retain older diagrams, including the title clearance. Tests cover zero/fractional/asymmetric padding, validation, empty and long-title zones, grow-only automatic expansion, and content clamping for all eight resize handles with fixed opposite anchors. Project roundtrips, matching-ID source application, auto-layout preferences, labels and leaders, and image exports remain covered.

Native review builds the Aurora greenhouse entirely through the editor: three stage zones, a nested climate room, all five node shapes represented across the zone/attachment scenarios, forward flow, a dashed return, fixed waypoints and a manual label leader. It aligns and distributes stages, fits selected zones, edits padding, exercises every resize handle and Escape, moves a child, checks numeric minimum sizes, rejects invalid padding, saves/reopens the project, and exports SVG/PNG. The final demonstration uses existing waypoint and attachment controls to place the return outside the stages; F3 automatic flow/feedback layout remains deferred.

Run `DIAGRAM_URL=http://127.0.0.1:8000 node tests/native-zones.cjs` with a local server, Playwright and Chromium available. Evidence: `artifacts/zones-native-results.json`, `zones-aurora-greenhouse.mermaid-project.json`, `zones-aurora-greenhouse.png`, `zones-alignment-controls.png`, `zones-padding-controls.png`, the corresponding SVG/PNG exports, and `zone-features-browser-results.json` / `zone-features-unit-results.txt`.
## Diagram themes

The theme run passes **365 checks**: 168 unit/model/routing checks, 30 browser/library/export checks, 80 app-handler checks, 23 native editing-control scenarios, 18 native attachment scenarios, 23 native zone scenarios, and 23 native theme scenarios. Browser and native sessions report no JavaScript errors.

The theme session builds a Moonlight seed library from Mermaid with all five node shapes, three stages, a nested climate room, forward paths and dashed feedback loops. It arranges whole stages through native drags and Align top, moves a label to display its leader, and adds a manual waypoint. Switching all four themes repeatedly preserves exact object geometry, route paths, label transforms, leaders and source text.

Checks cover stable stage colors under movement and resizing; nested inheritance from custom parent fills; new nodes and zones; independent fill/text overrides; untouched popup no-ops; Reset to theme; Cancel/Escape; invalid input and invalid saved themes; one-step Undo/Redo; source edits; Auto layout; native file-picker save/open; standalone SVG and PNG rendering; and Mermaid export. Automatic text contrast is checked across light, dark and mid-tone fills and deep nesting. The earlier Color popup's implicit text override is removed.

Mobile tests use native touch input, theme selection, color editing, resets, Properties, Undo/Redo and save/open. Theme cards and color popovers fit widths 320, 390, 600 and 850 with 44px touch targets. Keyboard selection, focus return and accessible per-color Reset labels are included.

Run `DIAGRAM_URL=http://127.0.0.1:8000 node tests/native-themes.cjs`. Evidence and screenshots are in [artifacts/themes](artifacts/themes/), including `results.json`, the regression result files, project files, exports, `desktop-themes.png`, `desktop-botanical.png`, `mobile-themes.png` and `mobile-override.png`.
