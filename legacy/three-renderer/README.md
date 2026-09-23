# legacy/three-renderer

Moved out of `svelte/` during the Svelte → ClojureScript migration
(ADR-2608260900). This is a Three.js renderer (WebVR incident scene +
spark/splat-cloud/gaussian/4D demos) and Three.js is banned for new code
under this workspace's 3D rule — all 3D goes through kami-engine
(WebGPU + WGSL first, WebGL 2.0 fallback). It is not ported into the new
cljs app and not wired into any build.

Rebuilding this view on kami-engine is an open product decision, not
something this migration decided. The code is kept here, verbatim, so the
prior implementation is not lost.
