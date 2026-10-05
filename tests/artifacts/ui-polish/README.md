# UI polish verification — 4 October 2026

Run `npm test`, then open `tests/browser.html` and `tests/ui.html` through the local HTTP server. The browser suite verifies imports, native routing and exports; the UI harness exercises the actual app handlers, substituting pointer capture and suppressing OS downloads for its synthetic events.

Results: 168 unit/model/routing tests, 30 browser checks, 91 UI checks and 22 native review checks. `native-results.json` describes native mouse/keyboard/file-picker input on desktop and in narrow responsive frames. Touch events are covered by the UI harness; this run did not use a physical mobile device. `responsive-preview.html` allows manual width changes without reloading the embedded app.

`request-workflow-fixture.mermaid-project.json` is the review input. `native-baseline`, `native-saved` and `native-reopened` are actual Save downloads and match exactly. `file-verification.json` records the roundtrip and real File-menu SVG/PNG export checks. The exported PNG and all included screenshots were visually reviewed.

The UI regression suite includes the issues found during live review: arrow keys leaking through submenu navigation into canvas nudges, and context measured while Properties was hidden. It asserts unchanged model/history during menu navigation and correct content height after opening a sheet.
