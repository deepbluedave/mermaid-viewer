# Mermaid Viewer

A local browser-based editor and viewer for Mermaid diagrams. The Mermaid and Panzoom bundles are stored locally in `vendor/`, so rendering does not depend on a CDN.

## Run locally

From this directory, start a small local web server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/viewer.html>. The viewer loads `diagrams/zones-and-subzones.mmd` into the left editor by default. Paste another Mermaid diagram into the editor to preview it; `diagrams/architecture.mmd` is also included as an example.

Opening `viewer.html` directly as a `file://` URL may prevent the browser from fetching the starter diagram. Use the local server command above, or paste source into the editor.

## Bundled libraries

Third-party license notices for the local Mermaid and Panzoom bundles are in [vendor/THIRD-PARTY-LICENSES.md](vendor/THIRD-PARTY-LICENSES.md).
