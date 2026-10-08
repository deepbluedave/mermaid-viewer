# Live-save fallback verification

The file/clipboard browser harness passes 37/37 checks; the Node suite passes
244/244 checks. New coverage verifies retained-handle manual saving and autosave
without picker APIs, independent Save picker availability, retry after a blocked
picker without refreshing, and blocked Save as preserving the original file and
its unsaved state. The download observer remains idempotent across API reinstalls.

A separate native Chrome check of the existing icon release opened the actual
macOS Save dialog, created a JSON project under `/private/tmp`, and added a node
through the UI with the existing autosave preference enabled. Reading the same
disk file confirmed that the node was written; the footer reported Saved and
Working file connected. `native-autosave.png` captures that successful state.
The temporary entry was removed from recent files and its tab closed. This check
establishes that live save was present before the fallback fix; it does not claim
to reproduce the user's particular browser failure.
