# Browser preferences and editor refinements — 5 October 2026

- `unit-results.txt`: 205 passing model, routing, persistence, clipboard, preference and description checks.
- `ui-results.json`: 92 passing editor-handler checks, including paired Open/Save controls, tool order, retained parent menus and all five shape previews.
- `browser-results.json`: 30 passing library/import/layout/SVG/PNG checks.
- `storage-results.json`: 33 passing file, clipboard, recent-file and description-handler checks.

Total: **360 automated checks**. Syntax checks and `git diff --check` passed.

The file harness uses controlled file handles and permissions with production UI handlers. It verifies autosave browser preferences across New, Open and refresh; recent-file disk freshness, identity deduplication and removal; detached copies persisted through actual IndexedDB; concurrent recent transactions; current Mermaid source reopened as an import; and description display, geometry, clipboard, Undo and SVG export. Model checks reserve title space above children for zones and all five parent-node shapes.

Native Browser skill review captured `shape-previews.png`, `desktop-flyout.png` and `mobile-flyout.png`. Description typing/toggling and shape previews were operated through normal controls. At 320px the File/Export panels stay visible and bounded; all four application menu buttons retain at least 44px width and the Open/Save icons have their own space. The existing editor regression also checks responsive chrome from 320–1800px.

OS chooser dialogs and persistence of real native filesystem handles were not automated. File access/permission branches use controlled handles; browser-copy persistence and concurrent storage use real IndexedDB. Harness pages ran on localhost, separate from the user's 127.0.0.1 preference/recent-file storage. Run `npm test`, then open `tests/ui.html`, `tests/browser.html` and `tests/storage.html` on the local server to reproduce the automated checks.
