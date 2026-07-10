# PORT-NOTES.md

Reference test cases from `reference/react-three-fiber/packages/fiber/tests/`
that were **not** ported into this package's test suite, with a one-line
reason each. Ported cases are listed in their own test file as
`describe`/`it` titles referencing the upstream name (see SPEC.md's
"Testing" section for the file mapping).

## `renderer.test.tsx` → `tests/renderer.test.ts`

- `should render extended elements` (second half only — `const Component = extend(THREE.Mesh); root.render(<Component/>)`) —
  this package's `extend()` (locked in SPEC.md) only registers names for
  `resolve()`; it never returns a usable scene-description tag the way r3f's
  `extend()` returns a JSX component. The first half of this test (a custom
  class registered via `extend({ Mock })` and rendered by tag name) IS ported.
- `should go through lifecycle` — asserts a React hook-ordering sequence
  (`useInsertionEffect`/ref callback/`useLayoutEffect`/`useEffect`/render).
  Domphy has no hooks and no separate mount-phase ordering to assert on; the
  only comparable event is `onUpdate` (r3f parity, "after props applied"),
  which has no ordering story against anything else to test.
- `should forward ref three object` — React `ref`/`createRef`/`useRef`
  forwarding has no Domphy equivalent; the scene grammar's own instance-access
  mechanism (`onUpdate: (self) => {}`) is exercised instead throughout
  `renderer.test.ts` (e.g. "should handle unmount").
- `should gracefully handle text` — JSX text children (`<>one</>`) and
  `suspend-react`'s `suspend()` don't exist in the scene grammar (there is no
  text-node concept in a three.js scene tree) or in this package (no Suspense
  analog — SPEC.md's non-goals explicitly rule out a Suspense port; async is
  `ReadableState` via `loader.ts`).
- `should gracefully interrupt when building up the tree` — exercises React's
  concurrent-rendering interruption model (`suspend()` + commit ordering
  against `useLayoutEffect`). No scheduler/concurrent-rendering concept exists
  in Domphy's synchronous reconcile-on-notify model.
- `should toggle visibility during Suspense non-destructively` — Suspense-only
  (`React.Suspense`/`React.use`); no Domphy equivalent (see SPEC.md non-goals).
- `should hide suspended objects when displaying fallback` — Suspense-only,
  same reason.
- `resolves conflicting and prefixed elements` — this test is about resolving
  JSX tag-name collisions between an HTML/SVG built-in tag (`<line>`) and a
  three.js class, plus an r3f-specific `three`-prefixed disambiguation
  (`<threeLine>`). Domphy's scene grammar has no HTML/SVG tag catalog to
  collide with in the first place (a scene description's first key is always
  resolved directly against the three.js namespace via `catalog.ts`'s
  `resolve()`, already covered by `tests/catalog.test.ts`) — there is no
  namespace-collision scenario to reproduce.

## `events.test.tsx` → `tests/events.test.ts`

- `can handle a DOM offset canvas` — relies on `state.size.left`/`state.size.top`
  (r3f's `Size` carries a DOM offset so `computePointer` can subtract it from
  `offsetX`/`offsetY` before deriving NDC). SPEC.md's `SizeState` (locked in
  `types.ts`) is `{ width, height, dpr }` only — no `left`/`top` — and
  `events.ts`'s `computePointer` (faithfully) reads `event.offsetX`/`offsetY`
  directly with no offset subtraction. There is no field to set that would
  make this case behave differently from the plain `onPointerDown` case
  already covered above; porting it verbatim would just duplicate that test.
  Contract gap, not fixed here (would require widening the locked `SizeState`
  shape).
- `it.todo('can handle different event prefixes')` — upstream itself never
  implemented this case (`it.todo`, no body); nothing to port.

## `hooks.test.tsx` (useLoader part) → `tests/loader-acceptance.test.ts`

- `can handle useThree hook` — not a `useLoader` case; out of scope for this
  port (the `RootState` it reads — camera/scene/size/raycaster — is exercised
  by `tests/root-state.test.ts` and `tests/patch.test.ts` instead).
- `can handle useFrame hook` — not a `useLoader` case; out of scope for this
  port (per-frame callback registration is exercised by `tests/loop.test.ts`
  and `tests/reconciler.test.ts`'s `onFrame` coverage instead).
- `can handle useLoader with an existing loader instance` — `loadAsset`'s
  signature is locked in SPEC.md's Loader section to
  `loadAsset(LoaderClass: Constructable, ...)`: a constructor, not an
  already-built instance. `loader.ts`'s `getLoaderInstance` unconditionally
  does `new LoaderClass()`, so handing it a live instance would throw at
  runtime ("X is not a constructor"), not silently adopt it the way r3f's
  `useLoader` does. No Domphy-meaningful equivalent to port without changing
  the locked contract — flagged as a contract gap, not fixed here.
- `can handle useGraph hook` — not a `useLoader` case; `@react-three/fiber`'s
  `useGraph` (build a `{nodes, materials, meshes}` map from an arbitrary
  `Object3D`) has no dedicated Domphy hook in SPEC.md — `loader.ts`'s
  internal `buildGraph` already covers the one place SPEC.md wants this
  behavior (post-load asset results), and is exercised there
  (`tests/loader.test.ts`'s "gltf-style .scene results..." case). Out of
  scope for this port.
- `can handle useInstanceHandle hook` — React-specific: exposes the fiber's
  internal `Instance` handle keyed off a React ref. Domphy has no ref/fiber
  concept to port this onto; a `SceneNode` is already reachable directly via
  `instance.__domphy` (see `types.ts`).
- `can handle future (19.x) hooks without crashing` — React-specific: asserts
  `React.useEffectEvent` (a React 19 hook) doesn't crash when called. No
  Domphy equivalent; not a `useLoader` case.

## `index.test.tsx` → `tests/api.test.ts`

- `createRoot > should return a Zustand store` — RootState here is a plain
  object, not a Zustand store; there is no `getState()`/subscribe API to
  assert against. The equivalent guarantee ("mounting via `three()` succeeds
  and produces a usable root") is already covered by `tests/patch.test.ts`'s
  mount tests.
- `createRoot > should handle an performance changing functions` (upstream
  itself marks this `// TODO: deprecate`) — r3f's adaptive `performance`
  system (`performance.min`/`regress()`/`current` decay timer) has no
  equivalent field in `ThreeOptions`/`RootState` (SPEC.md's locked contract);
  not a port target.
- `createRoot > should toggle render mode in xr` — WebXR is out of scope;
  `RendererLike` has no `xr` field and `RootState` has no XR render-mode
  concept.
- `createRoot > should respect frameloop="never" in xr` — same XR gap as
  above (frameloop="never" itself, without XR, is exercised in
  `tests/loop.test.ts`).
- `createRoot > should set renderer props via gl prop` — exercises the
  default-renderer branch (`new THREE.WebGLRenderer({ canvas, ...gl })`)
  reading back `gl.capabilities`. jsdom's canvas has no real WebGL context
  (`getContext("webgl")` returns null), so constructing a real
  `THREE.WebGLRenderer` throws under jsdom; every test in this package
  injects `createRenderer` for exactly this reason. Not portable without a
  WebGL-context polyfill, which is out of scope for this package.
- `createRoot > should set a renderer via gl callback` — upstream's `gl` prop
  is overloaded to also accept a renderer-construction function. In this
  package that use case is `createRenderer` (a distinct, already-tested
  option — see `tests/patch.test.ts`); `ThreeOptions.gl` is typed strictly as
  `Record<string, any>` (constructor params only), so a callback form doesn't
  exist to port.
- `createRoot > should update scene via scene prop` and
  `should set a custom scene via scene prop` — upstream's `scene` option
  configures/replaces the root's `THREE.Scene` instance itself. In this
  package `ThreeOptions.scene` is the scene-graph **children** description
  (`SceneChildren | SceneFunction`, SPEC.md's locked scene grammar) — a
  completely different field with no "replace the Scene instance" or
  "apply props onto the Scene" equivalent.
- `createRoot > should respect legacy prop` — `legacy` (three.js
  `ColorManagement.enabled` toggle) is not a field on `ThreeOptions`.
- `createPortal > should create a state enclave` and
  `should handle unmounted containers` — `createPortal` (rendering into a
  foreign `THREE.Scene`/object with an isolated state enclave) has no
  equivalent API surface in this package; SPEC.md's scene grammar and
  `index.ts` barrel don't mention portals.
- `exports > are consistent between targets` — compares `src/index.tsx`
  (web) against `src/native.tsx` (react-native). This package has one target
  (`src/index.ts`); there is no native/web split to compare.
