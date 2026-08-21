# @domphy/three Changelog

## 0.3.1

- Reconciler/patch/diagnose audit-fix pass (`tag-not-first` rule, pointer/container NDC, asset cache-hit warn).

## 0.3.0

- `clearAsset(…, { dispose: true })` disposes GPU resources (geometries/textures/Object3D graphs, cycle-safe).
- `loadAsset` dev-warns when a cache hit carries a different `configure`.
- Pointer math aligns with the container rect (correct NDC under padding/border).
- The NUL byte in `loader.ts` is fixed — the file is lint-covered again.

## 0.2.1

- Declarative three.js scene graph on Domphy reactivity (R3F-class reconciler).
- `three()` patch, `extend()`, asset loaders, scene-level `diagnose`/`validate`.

## 0.2.0

- Initial public release.
