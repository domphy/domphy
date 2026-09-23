# @domphy/three Changelog

## 0.4.0

- **`dpr` defaults to `[1, 2]`** (was a hard `1`), matching the reference default — scenes were rendering at CSS resolution and looked soft on every HiDPI display. It is also re-resolved when `devicePixelRatio` changes (browser zoom, moving the window to another screen), which fires no resize on a fixed-size host.
- **Renderer defaults match the reference**: `powerPreference: "high-performance"` and `alpha: true` are added alongside `antialias: true`. A scene with no background now shows the page through the canvas instead of opaque black — pass `gl: { alpha: false }` for the old behavior.
- **`fallback`**: text placed inside the `<canvas>` as its fallback content, i.e. the accessible name assistive technology reads for the scene. A 3D canvas had no accessible representation at all before.
- **`root.viewport(listener?, camera?, target?)`**: the visible frame in world units (`{ width, height, aspect, distance, factor, dpr }`) — the reference's `getCurrentViewport`, read reactively through the listener so it follows resizes.
- `root.clock` no longer uses `THREE.Clock`, which is deprecated since three r183 and logged a console warning on every mount. `FrameClock` keeps the same API (`getDelta`/`getElapsedTime`/`elapsedTime`/`oldTime`).
- A failed `loadAsset` no longer reports `[object Event]`: image/XHR loaders reject with a DOM event, now described by type plus the HTTP status when one is available.
- **New `diagnose` rule `invalid-child`** (error): a scene child that is a string, number, boolean or unspread nested array. Writing props as the tag's value — `{ meshStandardMaterial: { color: "orange" } }` instead of `{ meshStandardMaterial: null, color: "orange" }` — makes `color` a child node whose own child is the string `"orange"`, which throws at mount. That exact mistake had shipped in this package's own README and three docs pages; all four are fixed.
- Docs: the `three()` option table, the `RootState` reference, and an accessibility section were missing entirely.
- **Scene callbacks are contextually typed.** A scene description was `Record<string, any>`, so every callback written inline in a scene — `onClick(event)`, `onFrame(root, delta, self)`, `onChange(event, root, self)`, `onUpdate(self)`, a reactive `(l) => …` prop, a lazy `args: (l, root) => …` — had implicitly-`any` parameters: ~100 `TS7006` errors across this repo's own three examples under `noImplicitAny`, and no autocomplete or member checking for anyone else. The scene types now provide contextual types the way `@react-three/fiber`'s `ThreeElements`/`EventHandlers` do, without closing the open grammar (no key is rejected). New exports: `SceneProps`, `SceneValue`, `ReactiveProp<T>`, `InstanceEventHandler`, `IntersectionEvent`. Annotate a scene array built outside the `three()` call as `SceneProps[]` to keep the typing.
- **`ThreeEvent<TEvent>` includes the native event's properties.** The runtime copies every non-function property of the DOM event onto the event object (and the docs said so), but the type exposed only `nativeEvent`, so `event.deltaY` / `event.clientX` / `event.shiftKey` did not typecheck. `ThreeEvent<TEvent>` is now `IntersectionEvent<TEvent> & Properties<TEvent>`, r3f parity.
- **New `eventSource`/`eventPrefix` options** (r3f parity): bind pointer listeners to a DOM node other than the canvas — for an HTML overlay positioned on top of it that would otherwise swallow the events three needs to raycast. `eventPrefix` picks which coordinate pair (`offset`/`client`/`page`/`layer`/`screen`) click-distance measurement reads, since `offsetX`/`offsetY` stop being meaningful once the listener isn't on the canvas itself.
- **`applyProps` now copies `THREE.Layers`' mask instead of replacing the instance.** Assigning a fresh `Layers` value (`layers: new THREE.Layers()`) previously did a raw property assignment — any code elsewhere holding a reference to the object's original `layers` instance silently stopped matching it. Duck-typed (mask/test/enable), same reasoning as the existing `isColor`/`isShaderMaterial` checks — `Layers` has no `.copy()` and no `.isLayers` flag to check instead.
- **A custom `extend()`-ed class's own callback no longer forces `TS7006` past 3 parameters.** `InstanceEventHandler` (typing every `on[A-Z]…` key not in the 5 explicit rule-4 names) gained a trailing `...rest: any[]`, so a class with its own 4+-arg callback under an arbitrary name types cleanly instead of losing its parameter types to implicit `any`.
- **`ThreeOptions.camera`/`raycaster` are typed `SceneProps`** (were `Record<string, any>`) — both bags flow through `applyProps` exactly like a scene node's own props, so they now get the same rule 1-7 contextual typing. `gl` is typed `WebGLRendererParameters` (from `three`'s own types) since it's only ever read as `WebGLRenderer` constructor params.
- `package.json` declares an optional `typescript: ">=4.4"` peer — the `on${string}` template-literal index signature in `SceneProps` needs it; a JS-only consumer with no TypeScript installed is unaffected.

## 0.3.2

- `onCreated(root)` is typed `CreatedRootState` (`RootState` + `setSize`).
- README `diagnose`/`validate` snippets bind `options` then pass that object.

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
