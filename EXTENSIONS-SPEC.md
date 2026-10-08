# Diagram Studio — Mermaid features and WebMCP

Status: implemented and verified locally, 8 October 2026.

## Scope

Extend the existing flowchart editor with actor/icon nodes, selected standard shapes,
bold/italic Markdown labels, common appearance import/export, canvas container
collapse, and optional WebMCP tools. Existing project version 1 remains readable.
The editable model remains authoritative. Preserve manual arrangements, context,
containment, connections, Undo/Redo, browser recovery, and file autosave preferences.

## Shapes and icons

- Retain existing shapes; add stadium, hexagon, document, cloud, person and icon.
- Provide Human actor and Agent actor presets, the local Studio collection and the
  full Tabler, Lucide, Carbon, Phosphor, Fluent Color and SVG Logos packs. No runtime
  icon API/CDN, external font/image download, or new server dependency.
- A searchable icon picker previews results and filters by pack. It supports keyboard
  selection, cancellation, pagination and one-step Undo/Redo. Bundled packs load only
  from app assets; view boxes, aliases, colours and gradient IDs render correctly on
  the canvas and in standalone SVG/PNG exports. Ship pinned sources and full licenses.
- Icon properties: reference (`pack:name`), background (none/square/circle/rounded),
  label position (top/bottom), and icon size (48–256). Unknown icons show a question
  mark, with their label and connections retained.
- Menus show previews; Properties exposes icon configuration. Preserve node IDs,
  context and connections when switching shapes. Actors can become containers;
  container icons occupy the header above the children.
- Shapes and formatted labels participate in sizing, selection, routing, resizing,
  nesting, automatic layout and exports. Arrow tips meet the visible outline.
- Default Mermaid export uses standard shape/icon syntax. A portable Mermaid
  export uses ordinary labeled shapes for newer shapes/icons and editor comments
  restore their appearance when reimported. Test normal exports without registered
  icon packs, and portable exports using only traditional flowchart syntax.

## Limited Markdown

- Plain text remains the default. An explicit text-format field supports Markdown
  bold and italic, including combined emphasis, line breaks and escaped delimiters.
- Support node, edge and zone labels and description display. Format can be changed
  in Properties, persists in JSON/clipboard, and uses standard Mermaid Markdown
  strings in source. Keep unsupported rich-text syntax explicit rather than silently
  interpreting HTML, links or other Markdown constructs.
- Wrap at spaces, keep complete words, measure emphasis, and render styled SVG
  text runs. SVG/PNG exports retain formatting without external assets.

## Common appearance

- Import explicit styles and reusable classes for fill, text color, stroke color,
  stroke width and dash patterns that map to supported solid/dashed/thick edges.
- Resolve class styles and per-object overrides into the model; preserve supported
  meaning rather than original class names or source formatting.
- Export resolved theme colors and custom styles using standard Mermaid styles.
  Source edits carry explicitly imported appearance; absent appearance keeps prior
  custom properties for matching IDs. Preserve explicit theme/description context
  with editor comments when needed. Reject unsupported CSS properties and assets.
- Add compact border controls for nodes/zones and color/width controls for edges.

## Canvas collapse

- Zones and enabled parent nodes have an undoable Collapse/Expand command in
  Properties, object actions and a visible canvas control. Persist collapse state.
- Collapsed containers display a compact labeled proxy and hide all descendants
  and internal edges. External edges attach to the outermost collapsed ancestor;
  parallel edges retain separate identities, labels and attachment spacing.
- Projection never deletes objects or rewrites real edge endpoints. Expanding
  restores expanded dimensions and children exactly; moving a compact parent
  translates its real descendants once. Preserve nested collapse preferences.
- Selection, Fit, connections, exports and automatic layout operate on the visible
  presentation where appropriate. Hidden children can be selected from Hierarchy
  by expanding their ancestors. Never silently relayout on Collapse/Expand.
- Mermaid uses standard collapsed-subgraph metadata; portable exports retain
  expanded structure with comments to restore editor collapse state.

## WebMCP

- Feature-detect the current `document.modelContext` API, with legacy navigator
  compatibility. An unavailable API must not prevent normal editor startup.
- Tools: get_diagram, edit_diagram, apply_mermaid, arrange_diagram, export_diagram.
  Expose documented JSON schemas, supported shapes/features, selection, file state
  and a diagram revision. Read tools are annotated readOnlyHint.
- Batch edits validate and commit atomically as one Undo step. Use semantic
  operations, the same model helpers as UI edits, and an expected revision to
  reject stale requests. Failed/cancelled requests leave diagram/history intact.
- Retain manual placement unless requested; respect active gestures/source drafts
  and existing file conflicts. Tool results report actual accepted IDs/positions.
- Tools do not expose arbitrary JavaScript or filesystem handles. Existing
  autosave/recovery processes handle successful model changes.
- Registration errors are isolated; use AbortSignal for lifecycle/cancellation.
  Verify tools using controlled registration and real application handlers, plus
  native WebMCP where the test browser supplies it. Document browser limitations.

## Acceptance

Model/routing tests cover every added shape, styled text, style validation,
portable/native source, nested collapse projection and atomic/stale/cancelled
WebMCP operations. Browser tests exercise the real Mermaid parser/rendering and
editor controls, generated SVG/PNG, source reimport, project open/save, clipboard,
Undo/Redo and collapse movement. Missing icon packs must render a readable
fallback. Keep existing meaningful model, UI, storage and routing suites passing;
record native UI inspection and the scope of browser WebMCP support.

## Verification results

- Model, geometry, routing, file, clipboard and tool tests: **232/232 passed**.
- Existing Mermaid/rendering browser suite: **30/30 passed**.
- Existing editor UI suite: **92/92 passed**.
- File and clipboard browser suite: **33/33 passed**.
- Extension parser/render/export suite: **11/11 passed**.
- Extension UI and native WebMCP suite: **14/14 passed**.

The Codex in-app browser exposed the native `document.modelContext` API. All five
tools were discovered and exercised against real editor handlers. Atomic batches,
Undo/Redo, stale revisions, invalid edits, source drafts and switching files with
identical content were checked. Native pointer dragging of an actor and the canvas
Collapse/Expand control were also inspected; expanded child geometry and original
edge endpoints were preserved. Browsers without WebMCP retain normal editing.

Real Mermaid rendering checked missing-icon fallbacks, portable syntax, literal
asterisks in plain labels, escaped Markdown, description edits, explicit colors,
SVG and PNG output. The application starts blank and the source panel has no
Examples box. Existing file conflict handling remains in place; proactive disk
change monitoring is outside this extension scope.
