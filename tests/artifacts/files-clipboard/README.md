# Working files, autosave and diagram clipboard

Verified on 4–5 October 2026 using the local server, bundled Mermaid/ELK and libavoid WASM.

- `unit-results.txt`: 199 passing model/routing/file/clipboard checks.
- `browser-results.json`: 30 passing real-browser library/import/export checks.
- `ui-results.json`: 91 passing existing application-handler checks in download fallback mode.
- `storage-results.json`: 28 passing application-handler checks with controlled File System Access handles, clipboard permissions, deferred writes, disk changes and failures. Includes focused typing/Undo, completed versus cancelled gestures, New/Open/Save as safety, generation isolation, recovery, source drafts (including empty drafts), clipboard sections/containers/edge-only restrictions, offscreen and wide-group paste, and browser fallbacks.
- `native-results.json`: native keyboard/menu/touch-target observations. Cmd+C/V copies real selections and pastes through application handlers. Cross-tab automation transports its clipboard broker contents explicitly. Notes retain native text clipboard behaviour. The 320px header and File menu preserve 44px targets and viewport bounds.
- `native-section.clipboard.json`: the known five-node/four-connection clipboard fixture used for native testing.
- `native-downloaded.mermaid-project.json`: an actual browser Download a copy result, read from Downloads and validated against the complete pasted section.
- `disk-verification.json`, `real-autosaved.mermaid-project.json`, `real-working.mermaid-project.json`: production file-controller writes to real files through a filesystem adapter; verify complete model preservation, a subsequent snapshot, protection of external edits and explicit overwrite.
- `desktop-editor.png`, `file-menu.png`, `mobile-file-menu.png`: reviewed screenshots of the actual UI.

The native OS File System Access pickers are outside the browser automation's HTML `filechooser` event. Their grant dialogues were not automated. Direct-file API, permission and failure behaviour is tested through controlled handles in the real UI, complemented by real filesystem writes. An interactive browser smoke check should Open a JSON, change Notes, Save to that same file, enable Autosave and confirm subsequent disk changes.

Working-file handles and autosave preferences remain outside version 1 project JSON. Recovery is labelled separately from disk saves and requires an explicit file choice to reconnect after restoration. New-tab startup does not automatically offer another tab's recovery; File → Browser recovery exposes available records explicitly.
