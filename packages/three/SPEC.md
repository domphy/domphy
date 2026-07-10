# @domphy/three — SPEC (contract for all implementers)

Declarative three.js scene graph on Domphy reactivity. A 1-1 functional port of
`@react-three/fiber` core (the reconciler/events/loop), translated from React
idioms to Domphy idioms. **Read this file fully before writing any code.**
The vendored upstream lives at `reference/react-three-fiber/packages/fiber/`
— when behavior is unclear, diff against the reference, do not invent.

## Non-goals (locked — do not add)

- NO drei port, NO helper wrappers, NO `extras/` subpath. The package NEVER
  imports from `three/addons` or `three/examples` (not even in tests).
  Anything outside the `three` core namespace enters user-land via `extend()`.
- NO React concurrent/Suspense analogs. Domphy reactivity is fine-grained;
  async = `ReadableState` (see loader.ts).
- NO custom-tag support in @domphy/core. The scene description is a plain
  option object consumed by this package only.

## Locked architecture decisions

| Decision | Rule |
| --- | --- |
| Version-agnostic | No class catalog. Tag resolves by reflection: `registry[Pascal] ?? THREE[Pascal]`. Duck-type props (`.set`/`.copy`/`.setScalar`). Attach inference via three's `.isBufferGeometry`/`.isMaterial`/`.isObject3D` flags, never `instanceof`. |
| Renderer injectable | `createRenderer?: (canvas) => RendererLike`. Default `new THREE.WebGLRenderer({ canvas, antialias: true, ...gl })`. Tests inject a stub. |
| State-in | `three(options \| ReadableState<options>)`. Lifecycle hooks run once per DOM node — a fresh plain option object per parent re-render must NOT be required for updates; reactivity lives INSIDE the option (`scene: (l) => [...]`) or the option itself is a State. |
| `primitive` first-class | `{ primitive: [children...], object: existingObject3D }` adopts a user-created instance. Never disposed by us (implicit `dispose: null`). |
| `dispose: null` | Opts a node's subtree object out of auto-dispose on removal. |
| Naming | `gl` field name kept from r3f (mechanical example translation). All other identifiers: descriptive, no abbreviations (`index` not `i` except loop counters, `listener` as `l` only in user-facing grammar examples). |
| Comments | English only. Comment only non-obvious constraints, match core's comment style. |

## Module map & ownership

Each module is owned by ONE implementer. Do not edit files you don't own,
except `index.ts` (integration agent) and your own test file.

| File | Ports from reference | Contents |
| --- | --- | --- |
| `src/types.ts` | `three-types.ts` (loosely) | ALL shared contracts below. Written FIRST. Other agents import from it and must not edit it. |
| `src/catalog.ts` | `renderer.tsx` catalogue part | `extend()`, `resolve(tag)` |
| `src/props.ts` | `core/utils.tsx` (`applyProps`/`diffProps`/`attach`/`detach`) | prop application, pierced props, attach/detach, reactive binding |
| `src/loop.ts` | `core/loop.ts` | global loop, `invalidate`, `advance`, frameloop modes, priority takeover |
| `src/rootState.ts` | `core/store.ts` | `createRootState()` — camera/size/pointer/clock, resize |
| `src/loader.ts` | `core/hooks.tsx` (useLoader part) | `loadAsset`, `preloadAsset`, `clearAsset` |
| `src/reconciler.ts` | `core/reconciler.tsx` + `core/renderer.tsx` | `SceneNode` create/patch/reconcile/dispose |
| `src/events.ts` | `core/events.ts` + `web/events.ts` | raycast pointer events, capture, occlusion, `onPointerMissed` |
| `src/patch.ts` | `web/Canvas.tsx` (concept) | `three()` Domphy patch — the ONLY DOM touchpoint |
| `src/index.ts` | `index.tsx` | barrel: `three`, `extend`, `loadAsset`, `preloadAsset`, `clearAsset`, types |
| `tests/stubRenderer.ts` | — | `createStubRenderer()` used by all tests |

## Shared contracts (types.ts — exact shapes)

```ts
import type { Listener, ReadableState, State } from "@domphy/core";

export type Constructable = new (...args: any[]) => any;

// Minimal renderer contract — what the loop and patch actually call.
// WebGLRenderer satisfies it; WebGPURenderer satisfies it; tests stub it.
export interface RendererLike {
  render(scene: unknown, camera: unknown): void;
  setSize(width: number, height: number): void;
  setPixelRatio?(ratio: number): void;
  dispose?(): void;
  domElement?: HTMLCanvasElement;
  shadowMap?: { enabled: boolean; type?: number };
  toneMapping?: number;
  outputColorSpace?: string;
}

export type FrameCallback = (
  root: RootState,
  delta: number,
) => void;

export interface SizeState {
  width: number;
  height: number;
  dpr: number;
}

export interface RootState {
  gl: RendererLike;
  scene: any; // THREE.Scene
  camera: any; // THREE.Camera — current active camera
  canvas: HTMLCanvasElement;
  raycaster: any; // THREE.Raycaster
  pointer: any; // THREE.Vector2 — NDC coords, updated by events
  clock: any; // THREE.Clock
  frameloop: "always" | "demand" | "never";
  size: State<SizeState>; // reactive — read with size.get(listener)
  invalidate(frames?: number): void;
  advance(timestamp: number, runGlobalCallbacks?: boolean): void;
  frame(callback: FrameCallback, priority?: number): () => void;
  setFrameloop(mode: "always" | "demand" | "never"): void;
  onPointerMissed?: (event: MouseEvent) => void;
  internal: RootInternal;
}

export interface RootInternal {
  frameCallbacks: { callback: FrameCallback; priority: number }[];
  priorityCount: number; // callbacks with priority > 0 take over rendering
  interactive: any[]; // Object3D instances carrying pointer handlers
  captured: Map<number, Set<any>>; // pointerId -> capturing instances
  initialClick: [number, number];
  initialHits: any[];
  hovered: Map<string, any>; // event id -> last hover event data
  lastEvent: PointerEvent | MouseEvent | WheelEvent | null;
  active: boolean; // false after teardown — loop must stop touching this root
  frames: number; // pending demand-mode frames
  subscribersDirty: boolean;
}

// One node of the scene tree. `instance.__domphy` back-references the node.
export interface SceneNode {
  tag: string;
  instance: any;
  root: RootState;
  parent: SceneNode | null;
  children: SceneNode[];
  key: string | number | null;
  props: Record<string, any>; // last raw (unresolved) props for diffing
  attach: string | null; // resolved attach target ("geometry", "material-0", ...)
  previousAttach: any; // value restored on detach
  isPrimitive: boolean;
  autoDispose: boolean; // false when dispose: null or primitive
  releases: Array<() => void>; // reactive subscriptions, frame regs, event unbinds
  disposed: boolean;
}

export type SceneChild = Record<string, any> | null | undefined | false;
export type SceneChildren = SceneChild | SceneChild[];
export type SceneFunction = (l: Listener, root: RootState) => SceneChildren;

export interface ThreeOptions {
  scene: SceneChildren | SceneFunction;
  camera?: Record<string, any> | { instance: any };
  orthographic?: boolean;
  createRenderer?: (canvas: HTMLCanvasElement) => RendererLike;
  gl?: Record<string, any>; // WebGLRenderer constructor params when using default
  frameloop?: "always" | "demand" | "never"; // default "always"
  dpr?: number | [min: number, max: number];
  shadows?: boolean | "basic" | "percentage" | "soft" | "variance";
  flat?: boolean; // NoToneMapping
  linear?: boolean; // disable sRGB output
  raycaster?: Record<string, any>;
  events?: false; // false disables the pointer event system
  onCreated?: (root: RootState) => void;
  onPointerMissed?: (event: MouseEvent) => void;
}
```

## Scene grammar (user-facing, locked)

```ts
{
  mesh: [ ...children ] | null | (l, root) => children,  // first key = tag (camelCase of THREE class or extend() name)
  args: [1, 1, 1] | ((l, root) => any[]),   // constructor args; shallow-diff change => reconstruct instance
  attach: "geometry" | "material-0",         // explicit; else inferred from .isX flags
  dispose: null,                              // opt out of auto dispose
  raycast: null,                              // excluded from pointer raycasting
  _key: "a",                                  // reconcile identity (same semantics as core)
  position: [0, 1, 0],                        // duck-typed: .set(...) / .copy() / .setScalar() / assign
  "rotation-z": (l) => spin.get(l),          // pierced prop, reactive
  object: someObject3D,                       // primitive tag only
  onClick: (event) => {},                     // raycast pointer events (whitelist below)
  onChange: (event, root, self) => {},        // EventDispatcher binding (see on* rules)
  on: { "dragging-changed": (e, root, self) => {} }, // verbatim event names
  onFrame: (root, delta, self) => {},         // per-frame callback (useFrame analog), priority via onFramePriority
  onUpdate: (self) => {},                     // after props applied (r3f parity)
}
```

### Function-prop rules (deterministic, locked — implement exactly)

For a prop whose value is a function, decide in this order:

1. Key is a **pointer event** (`onClick`, `onContextMenu`, `onDoubleClick`,
   `onWheel`, `onPointerUp`, `onPointerDown`, `onPointerOver`, `onPointerOut`,
   `onPointerEnter`, `onPointerLeave`, `onPointerMove`, `onPointerMissed`,
   `onPointerCancel`, `onLostPointerCapture`) → register with the raycast
   event system (events.ts).
2. Key is `onFrame` → `root.frame(...)` registration (unregister in releases).
3. Key is `onUpdate` → stored, called after each props application.
4. Key matches `/^on[A-Z]/` AND `key in instance` → direct property assignment
   (covers three's assignable callbacks: `onBeforeRender`, `onBeforeCompile`, ...).
5. Key matches `/^on[A-Z]/` (not in instance) → `instance.addEventListener(name, fn)`
   where `name` = key minus `on`, first char lowercased, rest verbatim
   (`onChange` → `"change"`, `onObjectChange` → `"objectChange"`). Handler is
   invoked as `fn(event, root, instance)`. Unbind in releases.
6. Key is `on` (value is a record) → `addEventListener(exactName, fn)` per entry.
7. Anything else → **reactive value**: subscribe a Domphy listener; call as
   `fn(listener, root)`; on change re-apply the prop and `root.invalidate()`.
   Release old subscriptions before re-binding (mirror core's
   `ElementAttribute.set` release pattern — see
   `packages/core/src/classes/ElementAttribute.ts`).

### Reconcile semantics (reconciler.ts)

- Children arrays reconcile like core's ElementList: keyed match by `_key`
  when present, else positional match by same `tag`. Reused node → diff props
  (patch in place). New description at a position with a different tag →
  dispose old, create new.
- `args` change (shallow array compare; functions resolved first) →
  **reconstruct**: create new instance, move children's instances over,
  re-attach/re-add, swap in parent, dispose old instance (respecting
  `autoDispose`). Port r3f `reconciler.tsx` reconstruct logic.
- Attach: on add, if `attach` prop present use it; else infer:
  `.isBufferGeometry` → `"geometry"`, `.isMaterial` → `"material"`,
  `.isFog` → `"fog"`; `.isObject3D` → `parent.add()`. Attach supports dashed
  paths (`"material-0"`, `"geometry-attributes-position"`) — port
  `attach`/`detach` from `core/utils.tsx`.
- Removal: run releases, detach/remove from parent, recurse children, then
  dispose `instance.dispose()` if `autoDispose` and not scene/primitive;
  also dispose attached geometry/material created by us. `root.invalidate()`.
- Falsy children (`null`/`undefined`/`false`) are skipped (enables
  `cond && { mesh: ... }` in scene functions).

### Events (events.ts) — port, do not redesign

Port `core/events.ts` + `web/events.ts` 1-1 minus React-specific parts
(SyntheticEvent pooling, `setEvents` store plumbing simplifies to RootState).
Keep: intersection sorting + occlusion, `eventObject` bubbling through
ancestors, `stopPropagation()`, pointer capture map
(`setPointerCapture`/`releasePointerCapture` on the event), enter/leave
derivation from over/out, `onPointerMissed` (per-object and canvas-level),
`filter`/custom raycaster support, touch offset handling. DOM listeners bind
to the canvas in `connect()`, unbind in `disconnect()`.

### Loop (loop.ts) — port `core/loop.ts`

Global rAF loop shared across roots (module-level registry), per-root
`frames` demand counting, `invalidate(root, frames)`, `advance()`,
priority > 0 callbacks take over rendering (the root skips its own
`gl.render`), clock delta capping. In jsdom tests `requestAnimationFrame`
exists; `advance()` gives manual stepping.

### Loader (loader.ts)

```ts
export interface AssetResult<T = any> {
  data: ReadableState<T | null>;
  error: ReadableState<Error | null>;
  promise: Promise<T>;
}
export function loadAsset<T>(LoaderClass: Constructable, input: string | string[],
  configure?: (loader: any) => void): AssetResult<T>;
export function preloadAsset(...same): Promise<unknown>;
export function clearAsset(LoaderClass: Constructable, input?: string | string[]): void;
```

Cache key = `LoaderClass` + input (module-level Map, r3f parity). Multi-url
input resolves to an array. `configure` runs before `.load` (draco setup etc.).

### Patch (patch.ts) — the ONLY file that touches DOM/Domphy elements

`three(options)` returns a `PartialElement` for a `div` host (chart()
precedent — read `packages/chart/src/patch.ts` and follow its shape):

- `_onMount`: create canvas child, renderer (via `createRenderer` or default),
  rootState, camera (default `PerspectiveCamera(75, w/h, 0.1, 1000)` at
  `[0,0,5]`, or `OrthographicCamera` when `orthographic`, or
  `camera.instance`), apply `camera` props via props.ts (including `up`),
  `ResizeObserver` → size state + renderer.setSize + camera
  aspect/frustum update + invalidate, connect events (unless
  `events: false`), mount scene children through reconciler, start loop,
  `onCreated(root)`.
- Reactive `scene` function → ONE Domphy listener driving root children
  reconcile (mirror core `_setupFunctionChildren` release pattern).
- Option as `ReadableState` → subscribe, re-apply camera/dpr/frameloop/scene
  on change.
- `addHook("Remove")`: disconnect events, stop loop for this root
  (`internal.active = false`), dispose scene tree via reconciler, dispose
  renderer, disconnect ResizeObserver, release all subscriptions.
- Host style: `position: relative; overflow: hidden` + canvas
  `width/height 100%; display block; touch-action none`.

## Testing

- Every module ships unit tests in `tests/<module>.test.ts` derived from the
  corresponding reference test file where one exists.
- Acceptance: port `reference/.../fiber/tests/renderer.test.tsx`,
  `events.test.tsx`, and the applicable parts of `hooks.test.tsx` (useLoader)
  and `index.test.tsx` (API surface) into `tests/renderer.test.ts`,
  `tests/events.test.ts`, `tests/loader.test.ts`, `tests/api.test.ts`.
  JSX translates mechanically: `<mesh position={[1,2,3]}>` →
  `{ mesh: [...], position: [1, 2, 3] }`.
- Cases that are React-specific (StrictMode, Suspense throws, concurrent,
  react-test-renderer internals) are NOT ported — record every skipped case
  with a one-line reason in `tests/PORT-NOTES.md`. Never use `.skip`.
- All tests run against the REAL `three` package (devDependency) in jsdom,
  with `createStubRenderer()` injected via `createRenderer` so no WebGL
  context is needed. Use `flushSync()` from `@domphy/core` to drain
  reactivity synchronously; use `root.advance(time)` to step frames.
- Mount helper: create a real ElementNode via
  `new ElementNode({ div: null, $: [three(options)] })` rendered into
  `document.body` (see how core tests mount), or mount the patch directly —
  follow existing core/ui test patterns in `packages/core/tests/`.

## Definition of done (whole package)

1. `pnpm --filter @domphy/three build` passes.
2. `pnpm --filter @domphy/three test` passes — no `.skip`, no stubbed asserts.
3. `pnpm check` (biome, repo root) passes for the new files.
4. `tests/PORT-NOTES.md` accounts for every reference test case not ported.
5. No import from `three/addons` or `three/examples` anywhere in `src/`.
6. Public exports exactly: `three`, `extend`, `loadAsset`, `preloadAsset`,
   `clearAsset`, `diagnose`, `validate`, plus public types.

## Scene diagnose (added 0.2.0)

`diagnose(options)` / `validate(options)` — doctor's contract shape applied to
the three() option object (which @domphy/doctor cannot see). Built-in rules,
each from a real silent failure: `unknown-tag` (error — typo'd/unregistered
tag throws at runtime), `legacy-light-intensity` (warning — point/spot
intensity in the 0-1 legacy range; three r155+ physical units), `additive-blowout`
(warning — additive points with size ≥ 4 and opacity ≥ 0.6),
`camera-missing-lookat` (warning — off-axis camera position with no
onCreated). Per-node suppression via `_doctorDisable: true | "rule-id" |
string[]` — same convention as core elements. Reactive values are resolved
with a no-op listener; values needing a live root are skipped, never guessed.
