# Local icon packs and searchable picker

Implemented the full Tabler, Lucide, Carbon, Phosphor, Fluent Color and SVG Logos packs,
alongside the existing Studio icons. The picker searches 23,734 references, filters by
pack, previews artwork, paginates results and supports keyboard selection/cancellation.

- `npm test`: 244/244 unit checks pass.
- `tests/icons.html`: 21/21 browser checks pass, including all six real Mermaid imports,
  native/portable round trips, JSON reopen, Undo/Redo, SVG/PNG, gradient ID isolation,
  same-origin requests and a 390px viewport.
- `tests/extensions-ui.html`: 14/14 existing UI and native WebMCP checks pass.
- `tests/extensions.html`: 11/11 Mermaid rendering regression checks pass.
- Native WebMCP reports all seven packs and blocks edits while the picker is open.
- Rebuilding with `npm run build:icons` works offline once the pinned npm packages and
  bundled license files are present. Runtime assets require no external icon service.

`picker.png` shows the final interface; `browser-results.json` records the picker/UI
results. Pack versions, source URLs, licenses and data hashes are under `vendor/icons/`.
