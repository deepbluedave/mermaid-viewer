# Structural editor review

The requested revision is implemented and verified with 38 Node tests, 14 browser regressions, 30 UI acceptance tests, and native browser interaction. Both example models below were built from New through the toolbar, then saved and visually reviewed.

| Requested behavior | Implementation and current evidence |
| --- | --- |
| Intuitive Connect | Source/target clicks, contextual handles, crosshair and preview. UI acceptance checks zero blanket handles, source-only handles, cursor, cancellation and Undo. Native construction created the edges in both models. |
| Bridges at crossing lines | `bridges.mjs` draws stable jumps without altering libavoid routes or endpoints; smaller bridges fit crossings close to bends. Node cases, standalone SVG/PNG browser tests, and the native order export show three bridges. |
| Remove Group/Ungroup | Toolbar and handlers removed. UI tests confirm the commands are absent and deleting a zone retains its contents. |
| Minimum node spacing | 24-unit clearance during creation, dragging, shape/label growth, arranging and both Mermaid layouts. Tests cover stationary-node preservation, crowded placement, both supplied diagrams/layouts, and old project recovery. Both saved scratch models were checked pairwise for clearance. |
| Drag nodes into/out of zones | Intended centre chooses the innermost zone; previous zones do not chase dragged children. UI tests cover inner → outer → top level and atomic Undo. Native event-queue drops and Undo are recorded. |
| Drag zones into/out of zones | Destination highlight, descendant preservation, cycle prevention, and intended parenting retained through spacing correction. Native Research pipeline → Release review adoption and Fulfilment release are recorded; UI tests check the highlighted target and history. Moving borders stay clear of unrelated nodes. |
| Hierarchy and flows | Default collapsible containment tree and connection list. Selection follows the canvas and inspector; offscreen selections are revealed. UI tests and both demo screenshots verify the view. |
| Parent property visibly acts | Reparenting places an object inside its target, or outside its former root at Top level. Native Order API moved from `(80,136)` to `(119,349)` and Undo restored its parent and position. |
| Descriptions and notes | Fields on nodes and zones, optional version-1 project validation, click-away/save commits, history, matching-ID source preservation, and layout preservation. UI/browser checks and native contextual project reopening verify persistence. Project files retain context; Mermaid/image exports do not encode it. |
| Build, inspect, iterate | Order processing: five nodes, two zones, six flows and a retry loop. Research pipeline: four nodes, two zones, a decision, feedback flow and subsequent nesting. Native review found and corrected size typing loss, selected-tree hover contrast, collision-induced drop parenting, zone borders enclosing unrelated nodes, and missing bridges near short bends. |

Open `artifacts/order-processing.mermaid-project.json` or `artifacts/research-pipeline-nested.mermaid-project.json` in the editor to inspect the saved models. Screenshots and exported order images are alongside these files. `artifacts/structure-native-results.json`, `structure-browser-results.json` and `structure-ui-results.json` contain recorded evidence; reproduction instructions are in README.md.
