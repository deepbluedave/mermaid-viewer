# libavoid source and replacement

libavoid: Copyright (C) 2004–2009 Monash University; maintained by Michael Wybrow. The JavaScript port is by Vladyslav Hnatiuk. See LIBAVOID-NOTICE for upstream attribution.

The separately loaded routing library is **libavoid-js 0.5.0-beta.5**, distributed under LGPL-2.1-or-later. Its JavaScript and WebAssembly files are unmodified. The application invokes it through `routing.mjs` and imports `dist/index.js`; no library code is copied into application modules.

Included release and corresponding build source:

- `source/libavoid-js-0.5.0-beta.5.tgz`: the exact unmodified npm release package from https://registry.npmjs.org/libavoid-js/-/libavoid-js-0.5.0-beta.5.tgz. All runtime wrapper/WASM files match this archive byte for byte.
- `source/libavoid-js-5062a42.tar.gz`: https://github.com/Aksem/libavoid-js/tree/5062a42fbd82fff562afeebcbb7b1ed45eed8e75 — exact npm release git commit, including Embind bindings, wrapper sources, build scripts, and generated distribution.
- `source/adaptagrams-v1.0.5.tar.gz`: https://github.com/Aksem/adaptagrams/tree/v1.0.5 — the native source version pinned by that release's `tools/generate.py`.
- `LICENSE`: the wrapper's full LGPL text; `LIBAVOID-LICENSE`: the native libavoid licence.

The upstream source commit still labels its package metadata beta.4 and contains an older prebuilt WASM in `dist/`; npm published beta.5 with a fresh native build. The wrapper files match both archives. Use the npm archive for the exact shipped binary, or regenerate the WASM from the supplied preferred sources and pinned native v1.0.5 using the build instructions below. Do not substitute the older committed binary for the beta.5 release.

You may modify and replace this library for use with this app. Extract the wrapper source into a working directory, extract the native archive as `build/adaptagrams` there, install the build dependencies described by upstream, and run `python3 tools/generate.py` followed by `npm run build`. The supplied build script specifies Docker image `emscripten/emsdk:4.0.7`. Rebuilding is a development step that requires these toolchains; running the delivered app does not require Docker, npm, or internet access.

Replace `vendor/libavoid/dist/index.js`, `index-node.mjs`, and `libavoid.wasm` together with the compatible rebuilt distribution. The application loads the WASM by a local URL and has no integrity lock preventing replacement. Preserve the library API expected by `routing.mjs`, or adapt that module. Keep this notice, both licence files, and corresponding source with redistributions.
