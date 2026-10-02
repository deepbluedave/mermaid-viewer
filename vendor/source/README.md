# ELK sources

The Mermaid bundle incorporates **elkjs 0.9.3**, licensed under EPL-2.0. The full licence is in `../licenses/elkjs_0.9.3/LICENSE.md`.

- `elkjs-0.9.3.tar.gz` is the unmodified source at https://github.com/kieler/elkjs/tree/a8304cf79fde75bc2ab1a89d28320f53f8637436. It includes the exact generated JavaScript distributed by the release and its build configuration.
- `elk-v0.9.1.tar.gz` supplies the base Java sources at https://github.com/eclipse-elk/elk/tree/62d5909f96fad541bc101ad52dabaece6b7eab7e.
- The official release notes at https://github.com/kieler/elkjs/releases/tag/0.9.3 identify that Java baseline and the additional port-placement change: https://github.com/eclipse-elk/elk/pull/955. A copy is included as `elk-port-placement-955.patch`. The generated release files in the elkjs archive are the exact source used by this app's JavaScript bundler.

These source archives, licences, and notices accompany distribution. No ELK code was modified. To replace the shipped Mermaid bundle, use the application's pinned package-lock.json and `npm run build:vendor`; the build preserves upstream embedded notices and collects contributing package licences.
