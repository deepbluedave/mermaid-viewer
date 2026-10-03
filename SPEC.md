# Mermaid Diagram Editor — Requirements

Status: first-version requirements, revised for manual connection waypoints and labels on 3 October 2026.

## Purpose and workflow

Start with a Mermaid definition, generate an adaptive layout, and evolve the diagram through familiar visual editing tools. Users must be able to refine the layout and change the diagram's structure without rebuilding it from source or losing their arrangement. The result is an editable diagram whose contents can change as well as its layout.

The primary workflow is:

1. Paste or open a Mermaid flowchart.
2. Generate its initial adaptive layout with Mermaid/ELK.
3. Edit nodes, connections, zones, and their arrangement on the canvas.
4. Save the complete editable project or export its source or appearance.

Users can also start from an empty canvas through an undoable New command, then add objects or apply Mermaid source.

The first version supports Mermaid `flowchart` and `graph` definitions, including nested subgraphs, presented as zones. Other Mermaid diagram types are outside the editing scope.

## Diagram model and Mermaid source

After import, the editable diagram model is the source of truth. The initial Mermaid definition seeds this model. As users add, remove, or modify objects, the diagram evolves and its generated Mermaid evolves with it.

Source fidelity means preserving the supported meaning and structure of the current diagram. Preserving the original Mermaid text is not a requirement.

- Nodes have stable IDs, labels, shapes, descriptions, notes, positions, automatic or manual sizes, background/font colors, and optional container membership. Nodes can also be parents, using an optional `container` flag.
- Edges have stable IDs, source and target references, labels, descriptions, notes, direction, and line style.
- Zones have stable IDs, titles, descriptions, notes, positions, sizes, background/font colors, and parent/child relationships.
- Project settings include flow direction, layout preferences, global diagram font size, and canvas settings.
- Canvas commands, the properties panel, and source application all update this same model.
- Mermaid source is generated from the current model using consistent formatting. Original comments, whitespace, declaration order, and shorthand do not need to survive visual edits.
- Visual edits must appear in generated Mermaid, including added or removed objects, label and shape changes, connection changes, and zone membership changes.
- Parent nodes serialize as nested subgraphs, with reserved `%% diagram-studio-container {"id":"ID","shape":"rounded"}` comments retaining their node type and shape on editor reimport. Standard Mermaid displays these as subgraphs. Reject malformed or contradictory annotations.
- Generated Mermaid must describe the supported diagram structure. Manual coordinates and other editor layout settings belong to the project file.
- Unsupported imported Mermaid features must be identified before accepting an import or source application that would discard them. No silent loss of diagram content or unsupported semantics.

### Source editing

Keep a source panel available. Its normal contents are the generated Mermaid representation of the model.

Users can edit a source draft and explicitly apply it. Draft typing does not rerender or relayout the live diagram on every keystroke.

- Keep an unapplied draft separate from the current model. Visual edits must not silently overwrite it; users can apply it or explicitly discard it to return to generated source.
- A valid application updates the model and is one undoable action.
- Objects with matching stable IDs retain their manual positions where possible, manual size preferences, background/font colors, descriptions, and notes. Preserve global font size and guide preferences when applying source.
- Applying source with no matching object IDs fits the new diagram into the viewport.
- New objects receive sensible starting positions; deleted objects are removed.
- Changes to labels, shapes, or connections do not trigger a full layout.
- Invalid source shows an error while retaining the draft and the last valid diagram.
- A full automatic layout is an explicit command, apart from the initial import.

## Canvas editing

### Selection and navigation

- Click to select an object; Shift-click to extend or reduce the selection.
- Drag a selection box to select several objects.
- Move a node, a multiple selection, or a whole container.
- Moving a zone or parent node carries all nested zones and nodes. An object selected both directly and through an ancestor must move only once.
- Support keyboard nudging and optional grid snapping.
- Grid dots track diagram coordinates through pan and zoom. At distant zoom levels, show coarser multiples of the snapping grid to keep the dots readable.
- Preserve correct movement at every zoom level.
- Show stronger dark purple guides when the sides of moved or resized nodes and zones align with other nodes/zones. Use a tolerance below one screen pixel at every zoom. Guides are visual only; grid snapping remains a separate option. Exclude the moved selection, its descendants, and enclosing parents from comparison. Clear guides when a gesture ends or is cancelled, and exclude them from exports. Provide a Guides toggle, enabled by default.
- Provide distinct Select and Pan tools, with background dragging available for panning.
- Scroll to zoom; provide zoom controls and Fit. Fit includes all current diagram content, even when it lies outside the initial layout bounds.
- Escape cancels the active gesture or tool operation.

### Nodes

- Add a node at a chosen canvas location by clicking the Node tool and canvas, or dragging the toolbar button onto the canvas.
- Keep at least 24 diagram units between unrelated node bounds (exclude ancestor/descendant pairs) during creation, movement, shape/label growth, alignment/distribution, initial import, and both automatic layouts. Constrain the edited selection rather than moving unrelated nodes. Distribution may expand its extent to preserve the minimum gap.
- A new node inside a zone or enabled parent node joins the innermost containing object.
- Edit its label and change its shape.
- Initial shapes: rectangle, rounded rectangle, diamond, circle, and database cylinder.
- Shape changes preserve the node ID, zone membership, and connections.
- Node dimensions accommodate the label and selected shape. Resize manually through eight corner/side handles or Width/Height fields. Handles remain eight screen pixels at different zoom levels. Anchor the opposite corner/side; retain circles as circles. All shapes wrap text to the chosen dimensions, breaking only at whitespace and retaining explicit line breaks. Never split a word, long identifier, or unspaced Unicode text into fragments; grow the minimum shape/title size to fit an oversized word. Circle and diamond labels use their actual interior geometry, wrap short text such as “New Node” as dimensions shrink, and unwrap as they grow. On opening older projects, grow undersized labels without shrinking existing dimensions or losing manual preferences, then enforce spacing and containing bounds. Enforce label/shape minimums and the node gap instead of clipping text or moving neighbouring nodes; show the accepted dimensions in Properties. Resizing updates connections and expands containing zones without changing membership.
- Preserve manual size preferences through label/shape/font edits, source changes, and Auto layout. An explicit Fit to label command clears the manual size preference.
- Drop a node or zone onto an ordinary node, enable Container node in Properties, or choose an ordinary node as a child’s Parent, to turn it into a parent. All five shapes support node/zone children, nested parents, and existing connections. Keep the parent ID, shape, and label.
- Reserve a title band and shape-safe interior for children. Expand parents to contain descendants, without moving child coordinates during parent resize. Preserve containment through source edits, automatic layouts, save/open, and Undo/Redo.
- When the final child leaves or is deleted, return the node parent to an ordinary node, restoring its prior manual dimensions while retaining its ID, shape, context, colors, membership, and incident connections. Preserve this size preference through project save/open and matching-ID source application. Explicit empty container nodes remain enabled until they have children that leave; empty zones remain zones.
- Deleting or disabling a parent node retains its children and promotes them to its enclosing parent or top level. Reject cycles. Hierarchy selection/collapse includes parent nodes.
- Delete selected nodes and their incident edges as one undoable action.

### Zones

- Create and rename zones, including nested zones. Offer both click placement and dragging the Zone toolbar button onto the canvas.
- A new zone placed inside a zone or parent node joins the innermost container; drawing a zone over existing objects does not automatically capture them.
- Drag a zone from its body or title/header, with the same selection behavior as nodes; move its full contents together. Child objects drag independently. Shift-drag on a zone body retains marquee selection.
- Resize zones through eight corner/side handles or Width/Height fields while keeping them large enough to contain their contents and title. Keep contained node coordinates fixed while resizing the zone.
- Expand containing zones when moved children require more space.
- Organize containment through Add zone and dragging; remove Group/Ungroup commands.
- Remove a zone while retaining its contents and promoting them to its parent, or to the top level.
- Dropping a node or zone uses its intended centre to choose the innermost destination container. Show that destination while dragging. Dropping out releases it to an enclosing zone or the top level. Prevent cycles and preserve the moved zone's descendants.
- Do not expand the previous parent while a child is being dragged out. Apply movement and membership changes together as one undoable action.
- Keep a moved zone's border clear of unrelated nodes so its visible contents agree with the hierarchy. Minimum-spacing corrections retain the intended drop parent and can expand the new parent. Apply the intended membership before clearance so a destination parent body never pushes an entering child outside; a released child treats its former parent body as unrelated.
- Changing Parent in Properties visibly places the object inside the target container. Choosing Top level places it outside its former root container; reveal the moved object if offscreen.
- Connections between a moved zone and external objects reroute; internal connections remain attached to their moved contents.

### Connections

- Connect by clicking a source and then a target, or dragging between contextual node handles. Use a crosshair cursor. Show handles only for the hovered/source node, with a preview and clear source/target guidance. Escape cancels a pending source. Each successfully created connection returns to Select with the edge selected; another connection requires activating Connect again. Incomplete or invalid connection attempts keep Connect available.
- Edit its label, description, and notes, reconnect either endpoint, or delete it.
- Support directed, undirected, and bidirectional connections.
- Support normal, dashed, and thick line styles.
- Support parallel connections and self-loops.
- Draw small bridges at interior edge crossings to distinguish independent flows. Shared endpoints and overlapping/parallel segments are not crossings. A straight-through internal waypoint is not an endpoint/junction: merge forward collinear runs only for bridge drawing, retaining actual bends and reversals and leaving routed data/waypoints untouched. Preserve actual libavoid routes and arrow terminal segments; include bridges in SVG and PNG exports.
- Keep straight connections straight and reroute orthogonal connections with horizontal/vertical segments rather than deforming their previous paths.
- Give connections sharing a node side distinct attachment points, initially ordered towards their opposite ends. Use a modest 12-unit spacing where room allows and reduce it on crowded sides. Keep parallel route segments separated through libavoid and attach arrow tips to the visible shape outline, including curved and diamond nodes.
- Improve automatic order through native rerouting trials of adjacent orthogonal attachments with a nearby crossing. Accept only a reduction in their local crossing count, with no increased crossing/contact/overlap count against any peer, no new retraces, no extra avoidable detour through ordered unblocked waypoints, no increase in the two routes' combined length, preserved opposite endpoints, and leaf-buffer clearance. Unrelated routes must remain identical within 0.0001 units. Retain the entire usable baseline on a failed or rejected trial. Required pin alignment can change an individual route's length; compare its excess over the fixed points' Manhattan minimum to distinguish this from a detour.
- Limit automatic ordering to four adjacent-swap trials per settled geometry, groups of two through eight attachments, and diagrams with at most 4,000 routed points. Each native candidate uses at most two transactions including join repair. Do not repeat cleanup on redraw: cache geometry, and freeze the settled order during node/resize/waypoint gestures. Reevaluate on release; ties retain the baseline. Manual controls remain available on crowded sides and arrangements beyond the automatic budget.
- Add Source/Target order controls to selected edges: Move up/down for left/right sides and Move left/right for top/bottom sides, plus Reset side to automatic. A move saves the entire node/zone side stack; it controls order rather than precise positions. Manual choices override automatic scoring. New ends append after the saved stack; prune deleted/reconnected ends, remember inactive side choices, and reset only the active side. Retain choices through movement, resize, layout, history, and matching source changes. Reset route retains the order preference.
- Store optional node/zone `attachmentOrder: {north?, south?, west?, east?}` in version 1 project files, with arrays of unique `edgeId:source` or `edgeId:target` keys belonging to that object. Support both ends of a self-loop independently. Validate references and array bounds. Preserve native paths in SVG/PNG; Mermaid export omits this preference.
- Route around unrelated ordinary nodes. Zone and parent-node borders, interiors, and titles are traversable, including nested containers; adding or moving a zone must not introduce routing obstacles. Connections explicitly targeting zones or parent nodes attach to their visible outlines and approach the chosen side normally. External peers approach from outside; contained peers approach from inside. Use native libavoid directional pins at the attachment points, protecting only the immediate port vicinity while keeping the rest of the container traversable.
- Draw zone and parent-node titles above connections with translucent backing: crossing lines remain visible but subdued beneath the title. Preserve this appearance in SVG and PNG exports.
- Attach connections to the rendered node boundary, including nonrectangular shapes.
- Arrowheads follow a clean terminal segment and point correctly at the destination boundary.
- Automatic edge labels follow their routes and use suitable segments where possible. Separate parallel labels and avoid covering nodes, zone titles, arrowheads, other connections, or other labels. Where a label needs to sit beside its route, use a stronger dotted leader with constant screen stroke weight to identify the corresponding connection without changing the route.
- Drag a connection label without moving its route, preserving the pointer's grab offset. Click the label to enable arrow-key nudging; snapping applies to its centre. Cancel with Escape or capture loss and commit a complete gesture as one undoable edit. Reset label position restores automatic placement independently of route reset.
- Manual labels follow a normalized position along their current connection and retain offsets along/across the nearby route direction. Smooth that direction across short orthogonal jogs to avoid abrupt sideways jumps. Follow single/joint endpoint moves, container moves, straight/orthogonal routes, waypoint changes, reconnection, and automatic layout. Respect manual overlaps; reserve visible manual label boxes before placing any automatic labels. Draw manual labels above objects, while letting selected overlapping nodes/zones receive pointer gestures. Keep route segment controls clear of label boxes.
- Preserve the leader rule for automatic and manual labels: show a dotted line from the route attachment point to the nearest label border, with a dot at its origin, whenever the attachment lies outside the label box. Remove it when the point lies inside. Label movement never changes connection geometry.
- Add optional edge `labelPosition: {fraction, offsetAlong, offsetNormal}` to version 1 projects: fraction is finite from 0 to 1; offsets are finite diagram units with absolute values at most 1,000,000. Retain preferences even when label text is empty. Preserve through history, save/open, Auto layout, and matching-ID source application when endpoints match. SVG/PNG include exact labels and leaders within export bounds; Mermaid export omits placement preferences.
- Moving or resizing an object does not move unrelated objects to repair its connections.
- Support up to 100 ordered manual waypoints per connection in finite diagram coordinates (absolute values at most 1,000,000). Drag a segment's plus handle or use Add waypoint in Properties; adding a point switches straight routing to orthogonal. Drag or nudge individual points, remove them through Delete or Properties, and cancel a gesture/placement with Escape. Commit a complete gesture as one undoable edit. Keep route handles at a constant screen size when zooming; omit them from exports.
- Keep waypoint coordinates fixed for a single endpoint move, resize, or automatic layout. Translate them once when both endpoints undergo the same translation in one action, including dragging, nudging, alignment/distribution, and movement of an enclosing zone or node container. Moving a container at only one endpoint keeps external waypoints fixed. Self-loop waypoints translate with their node. Reconnecting retains waypoints for subsequent editing.
- Force Source/Target attachment sides independently of waypoint placement and movement. Retain forced sides when resetting a route. Require explicit Reset route before changing a manual route to Straight.
- Use libavoid to route every span between endpoints and waypoints, preserving all unblocked points in source-to-target order, including doubled-back paths. If a leaf node's routing bounds (including the eight-unit buffer) cover a point, retain it, display a conflict marker and explanation, skip it temporarily, and route around the obstacle. Automatically restore its participation when uncovered. A conflict marker must not intercept movement of the selected blocking node.
- Detect immediate retracing at joins between waypoint spans, ignoring segments within the 0.0001-unit numerical tolerance. Exclude reversals required by the next ordered waypoint and coincident-point spans. Try perpendicular departures through native directional checkpoints at the affected outgoing span's fixed source. Use at most one additional routing transaction; never repeat cleanup on its output. Accept the entire candidate transaction only if it reduces retracing, introduces no new reversal, does not lengthen any repaired connection, preserves finite orthogonal paths, ordered fixed span endpoints, source/target approach directions, leaf-node buffer clearance, and untouched span/connection geometry. Retain the entire baseline on validation failure or candidate error. Ordinary routes without candidates use one native transaction. Preserve exact manual coordinates even when they require a small alignment step near an attachment.
- For manually reordered source sides and automatic source-pin swap candidates, also permit a guarded perpendicular arrival at the first waypoint when an offset pin would cause retracing into the following span. An outline pin is not an explicitly ordered earlier waypoint. Route that first terminal span with reversed native endpoints so the binding can express the waypoint arrival as a departure checkpoint, then read its geometry in source-to-target order. Apply the same atomic join-repair safeguards. Keep explicit reversals between ordered waypoints and coincident spans.
- Add optional edge `waypoints: [{x, y}, ...]` to version 1 projects. Preserve points through save/open, history, and matching-ID source application when endpoints match. SVG/PNG preserve the actual manual route; Mermaid export omits routing coordinates.


## Toolbar and properties

Control placement and interaction are specified in [Editing controls](EDITING-UI-SPEC.md). Use that specification for the selection bar, action menus, attachment controls, narrow layout, and acceptance tests.

Provide consistent controls for:

- Select and Pan.
- Add node, Connect, and Add zone.
- Undo, Redo, and Delete.
- Align and Distribute in the selection bar for multiple selections.
- Zoom controls and Fit diagram on the canvas.
- Flow direction and layout controls.
- Auto layout.
- Open/import, Save project, and Export.
- New, to start with an empty diagram as one undoable action.

A selection bar exposes common actions for the selected node, connection, zone, group, or waypoint. More opens the full action menu. Right-click and long-press open actions for the clicked object or canvas position. Attachment controls open beside an endpoint. Properties groups precise fields and detailed information. On narrow screens, Details opens it as a sheet. Users must not need to edit Mermaid syntax to perform the supported visual operations.

Labels preview immediately for nodes, zones, and edges while retaining field focus/caret. Coalesce the continuous input session into one Undo action on commit. Label, description, notes, and size typing must commit before leaving the field, changing selection/tools, or saving/exporting. Disable editing controls while the local engines are starting or an asynchronous layout/import is running.

Provide a default Hierarchy view showing nested containment and a connection list. Selecting a tree or connection item synchronizes canvas selection and Properties and reveals it if offscreen. Support container collapse/expand and show selected objects in the tree. Keep Source available as another panel view.

Use familiar shortcuts for Delete, Escape, Undo/Redo, and arrow-key nudging. Toolbar controls and properties must also be keyboard accessible.

### Appearance and text

- Provide background and font color pickers and six-digit hex fields for nodes and zones in Properties. Valid picker input and hex values preview immediately in the diagram while retaining the focused control; a continuous input session commits as one Undo action. Partial invalid hex text keeps the last valid preview, and an invalid final value restores the original state. Child zones derive a slightly darker default background from their parent and inherit its title font color, unless explicitly overridden. Header/title backing is always a darker shade of the selected background. Apply the font color to the title. Preserve the translucent title backing above routes.
- Provide a global Text size control in the toolbar, from 10 to 48 pixels, defaulting to 13. Apply it to node labels, zone titles, and edge labels while leaving interface text unchanged.
- Accommodate larger labels through wrapping, label/shape minimums, title bounds, label placement, zone expansion, and rerouting. Retain manual size preferences and current pan/zoom so increasing text size does not immediately shrink the view. Fit remains an explicit command.
- Appearance edits are undoable and survive Save/Open, matching-ID source application, and Auto layout. SVG and PNG reflect the current font size and colors. Mermaid export contains the supported structure; the project file retains editor appearance.

## Layout and routing

Mermaid/ELK provides the initial adaptive layout and explicit Auto layout. The viewer owns manual positions after import.

Use an existing routing engine for connections around manually positioned objects. The proposed engine is libavoid through its browser/WebAssembly port; validate it against nested zones, node shapes, parallel edges, and self-loops before replacing the current path deformation approach.

Do not implement a custom route-finding algorithm. Integration code may translate the diagram model into routing inputs and apply routes, attachment points, arrowheads, and label positions to the rendered diagram.

Auto layout operates on the current diagram structure, including additions, deletions, zones, and node containers. After shape/title sizing and container expansion, enforce at least 24 units between unrelated siblings, including expanded container borders. Move compound groups rigidly during this correction; preserve free routing across zones. It is one undoable action. Changing automatic layout preferences must not silently discard manual arrangements; those preferences are applied through Auto layout.

## Undo and redo

Every completed model edit is undoable, including moves and their membership changes, shape/label/context/color/font changes, connection changes, resizing, deletion, source application, alignment/distribution, and Auto layout.

- One completed drag is one history entry, rather than an entry per pointer movement.
- Undo restores both structure and layout; redo reapplies them.
- Cancelled gestures and invalid source applications do not create history entries.
- Panning and zooming do not consume diagram-edit history.
- Persistent undo history across project reloads is not required for the first version.

## Saving and exporting

- Save a versioned project file containing the canonical diagram model and layout settings needed to restore the editable diagram.
- Reopening a project restores its nodes, edges, nested zones, labels, shapes, manual positions, sizes, and diagram settings without running a new automatic layout.
- An opened saved project starts with a clean save indicator. Legacy geometry violating minimum node clearance is corrected and marked for saving; valid saved geometry remains exact.
- Descriptions and notes on all objects, node/zone colors, manual node size preferences, global font size, guide preference, node container flag, and original node manual dimensions (`containerSize`) are optional fields in version 1 projects; older projects remain readable. Missing font size defaults to 13 pixels and missing guide preference to enabled; missing colors retain the standard appearance. Preserve these fields through save/open, Undo/Redo, Auto layout, and matching-ID source application. Mermaid and image exports do not encode these context fields.
- The project saves the evolved diagram; restoring the original import is not required to reopen or continue editing it.
- Export a valid Mermaid definition for the supported structure. Clearly indicate that Mermaid export does not preserve the editor's manual coordinates.
- Importing that Mermaid export starts a new editable diagram with an automatic layout. Reopening the project file restores the saved manual arrangement.
- Export the current arrangement as SVG and PNG, including all diagram content and excluding selection handles and other editing controls.
- Keep save/export operations distinct from Auto layout.

## Local operation

Retain the local browser application and offline operation. Bundle required JavaScript, WebAssembly, and other assets locally; normal use must not depend on a CDN, external service, account, or subscription.

Include the required third-party licence notices and satisfy the distribution terms of bundled libraries, including the routing engine. A local HTTP server is acceptable for loading the application and its assets.

## Deferred features

The following are outside the first version:

- Layers.
- Collaboration and shared editing.
- Editing additional Mermaid diagram types.

## Acceptance scenarios

1. Import the supplied zones-and-subzones example and receive an initial adaptive layout with editable nodes and nested zones.
2. Move a node at several zoom levels: the node follows the pointer, the canvas does not pan, and connected edges and labels follow with correctly oriented arrowheads.
3. Move an orthogonally connected node past another node: routes remain orthogonal and reroute around obstacles while unrelated nodes stay in place.
4. Move a zone containing a nested zone: every descendant moves once, internal connections remain attached, and external connections reroute.
5. Add a node and edge, edit their labels, and change the node to a diamond: IDs and connections remain intact and generated Mermaid reflects the evolved diagram. Exporting and reimporting that source preserves its supported structure, labels, shapes, and zone membership.
6. Drag nodes and zones into/out of zones and change Parent in Properties: the hierarchy and canvas agree, membership and movement undo together, and deleting a zone preserves its contents.
7. Undo and redo structural edits, a completed drag, and Auto layout: the corresponding structure and arrangement are restored.
8. Apply source changes using existing IDs: existing manual positions are retained where possible. Invalid or unsupported source does not silently replace the valid diagram.
9. Save and reopen a project: the complete manual arrangement is restored without relayout. Exported Mermaid reproduces the supported structure; SVG and PNG reproduce the current arrangement.
10. Run with external network access unavailable: editing, routing, project save/open, and exports continue to work using bundled assets.

11. Build diagrams from New using the toolbar: click-to-connect is clear, crossings have bridges, node gaps persist, and hierarchy selection follows the diagram. Add node/zone descriptions and notes, then save/open and apply matching-ID source changes without losing them.

12. Resize every node shape from corners/sides and through numeric fields. Check opposite anchors, label-fit limits, circle proportions, neighbour clearance, rerouting, Undo/Redo, and cancellation.
13. Move/resize aligned nodes and zones at different zoom levels: stronger dark purple side guides appear, clear on release/cancellation, respect the toggle, and do not export.
14. Set node/zone background and font colors and add edge context. Increase global text size through 48 pixels, retaining the view, label fit, manual size preferences, and readable exported content. Save/reopen and apply matching-ID source without losing these properties.

15. Preview a label and continuously change a picker while keeping its field focused; node/edge/zone rendering updates before click-away. One Undo restores the input session. Default nested zone colors track their parent while explicit child overrides remain unchanged; darker translucent headers and stronger leaders appear in exports.
16. Enable or select a node as a parent, create/drop children, nest another parent and a zone, change its shape, move/resize/delete/disable it, and verify descendant positions, hierarchy, routing, Undo, source roundtrip, and exact project restore. Entering children retain their intended drop position; exiting children regain clearance from the former parent body.
17. Resize “New Node” circles and diamonds smaller and larger, using different fonts and multilingual/long labels: text fits the actual outline and wraps/unwraps responsively.
18. Run both layout engines in all four directions on diagrams containing expanded zones; unrelated root nodes and sibling containers retain at least 24 units of clearance.

19. Drag nodes onto ordinary nodes of every supported shape, into/out of zones, and between parents: adopt the intended target, reject cycles and corners outside curved outlines, preserve the drop centre, demote a node whose final child leaves, and undo the gesture as one edit.
20. Drag Node/Zone toolbar buttons onto the canvas at different zoom/pan/grid/font settings, into existing containers or onto ordinary nodes. Show a placement preview and target, create one object on release, preserve click placement, and cancel on Escape, lost capture, or release outside the canvas without recording an edit.
