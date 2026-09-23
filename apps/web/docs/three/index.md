---
title: "@domphy/three"
description: "Declarative three.js scene graphs for Domphy — a 1-1 functional port of @react-three/fiber's core (reconciler, raycast pointer events, demand frameloop) with no JSX and no virtual DOM."
---

<script setup lang="ts">

import Quickstart from "../demos/three/quickstart.ts?raw"
</script>

# @domphy/three

`@domphy/three` is a declarative three.js scene graph for Domphy — a 1-1 functional port of [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber)'s core (reconciler, raycast pointer events, demand frameloop), translated from React idioms to Domphy idioms.

A scene is a plain object tree, the same way a Domphy DOM tree is: no JSX, no virtual DOM, no build step required. Reactivity comes from `@domphy/core`'s listener-based `State`, exactly like the rest of Domphy.

It never imports from `three/addons` or `three/examples` — no drei port, no helper wrappers. Anything outside the `three` core namespace (`OrbitControls`, post-processing passes, custom shaders, ...) enters user-land through [`extend()`](./grammar#extend-custom-classes).

## Install

```bash
npm install @domphy/three three
```

Peer dependencies: `@domphy/core`, `three >= 0.156.0`, `typescript >= 4.4`.

The `typescript` peer is optional (a JS-only consumer needs none of it) — it only gates the scene props' template-literal index signature, which requires TypeScript 4.4+ to type-check.

## Quick start

Apply the `three()` patch to a `div` with an explicit height — it creates the canvas, the renderer, and the render loop, and mounts your `scene` tree into it. `onFrame` on a scene node is the `useFrame()` analog: it runs every rendered frame as `(root, delta, self)`.

<CodeEditor :code="Quickstart" />

The host `div` needs an explicit width and height — the canvas fills its container, and a container with no size renders nothing.

Drive a prop from outside the scene by passing a `State` through a reactive (pierced) prop instead of mutating inside `onFrame`:

```ts
import { toState } from "@domphy/core"
import { three } from "@domphy/three"

const spin = toState(0)
setInterval(() => spin.set(spin.get() + 0.01), 16)

const App = {
  div: null,
  style: { width: "100%", height: "420px" },
  $: [
    three({
      scene: [
        {
          mesh: [{ boxGeometry: null }, { meshStandardMaterial: null, color: "orange" }],
          "rotation-y": (l) => spin.get(l),   // pierced prop, reactive
        },
        { ambientLight: null, intensity: 0.5 },
      ],
    }),
  ],
}
```

## `three()` options

`three()` takes a `ThreeOptions` object, or a `ReadableState<ThreeOptions>` when the mount needs to keep changing (only `camera`, `dpr`, `frameloop` and `scene` are re-applied on a state update — everything else is read once at mount).

| Option | Default | What it does |
| --- | --- | --- |
| `scene` | — | The scene tree: a description object, an array of them, or `(l, root) => children` for a reactive scene. |
| `camera` | `PerspectiveCamera(75, aspect, 0.1, 1000)` at `[0, 0, 5]` | Props applied to the default camera, or `{ instance }` to adopt your own (adopted cameras get no defaults). Setting `aspect`/`left`/`right`/`top`/`bottom` marks the camera `manual` so resizes stop reshaping it. |
| `orthographic` | `false` | Use an `OrthographicCamera` for the default camera. |
| `frameloop` | `"always"` | `"always"` \| `"demand"` \| `"never"` — see [frameloop modes](./animation#frameloop-modes). |
| `dpr` | `[1, 2]` | Render resolution: a fixed ratio, or a `[min, max]` clamp around `devicePixelRatio`. The default matches the device up to 2x, so scenes stay sharp on HiDPI screens without paying for 3x. Re-resolved automatically when `devicePixelRatio` changes (browser zoom, moving the window to another screen). |
| `shadows` | `false` | `true` (soft) or `"basic"` \| `"percentage"` \| `"soft"` \| `"variance"`. |
| `flat` | `false` | `NoToneMapping` instead of `ACESFilmicToneMapping`. |
| `linear` | `false` | Linear-sRGB output, and no automatic sRGB conversion for assigned color textures. |
| `gl` | `{ powerPreference: "high-performance", antialias: true, alpha: true }` | `WebGLRenderer` constructor params, merged over those defaults. `alpha: true` is why an unset scene background shows the page through the canvas instead of black — pass `gl: { alpha: false }` for an opaque canvas. |
| `createRenderer` | `new THREE.WebGLRenderer(...)` | `(canvas) => RendererLike` — swap in a `WebGPURenderer`, a post-processing composer, or a test stub. |
| `raycaster` | three's defaults | Props for the root raycaster. `params` is merged onto the existing per-object-type thresholds rather than replacing them. |
| `events` | enabled | `false` disables the raycast pointer-event system entirely. |
| `eventSource` | the canvas | A DOM node to bind pointer listeners to instead of the canvas — for an HTML overlay positioned on top of the canvas that would otherwise swallow the events three needs to raycast. |
| `eventPrefix` | `"offset"` | `"offset"` \| `"client"` \| `"page"` \| `"layer"` \| `"screen"` — which coordinate pair click-distance measurement reads off the native event. Only matters with `eventSource` set to something other than the canvas, since `offsetX`/`offsetY` are relative to `event.target`. |
| `fallback` | — | Text placed inside the `<canvas>` as its fallback content. See [Accessibility](#accessibility). |
| `onCreated` | — | `(root) => void`, called once the root is mounted and active — the hook for imperative setup (`root.camera.lookAt(...)`, `extend()`-ed controls, `root.gl` tweaks). |
| `onPointerMissed` | — | `(event) => void` for clicks that hit nothing in the scene. |

## The root (`RootState`)

`onCreated(root)` and every `onFrame` / reactive prop receive the same root object.

| Member | What it is |
| --- | --- |
| `gl`, `scene`, `camera`, `canvas`, `raycaster`, `pointer` | the live three.js objects |
| `clock` | frame clock — `getDelta()`, `getElapsedTime()`, `elapsedTime` |
| `size` | reactive `State<{ width, height, dpr }>` in CSS pixels — `(l) => root.size.get(l)` |
| `viewport(listener?, camera?, target?)` | the visible frame in **world** units at `target` (default: the origin): `{ width, height, aspect, distance, factor, dpr }`. Reads `size` through `listener`, so it re-runs on resize. |
| `invalidate(frames?)`, `advance(timestamp)`, `setFrameloop(mode)` | [render loop control](./animation) |
| `frame(callback, priority?)` | register a per-frame callback imperatively (`onFrame` is the declarative form) |
| `setSize(width, height, dpr?)` | `onCreated` only — resize the root by hand |

`viewport` is how you size things to the frame instead of to pixels: a plane scaled to `viewport.width` / `viewport.height` exactly fills the camera's view at the origin, at any canvas size.

```ts
three({
  scene: [
    {
      mesh: [{ planeGeometry: null }, { meshBasicMaterial: null, color: "tomato" }],
      // Always fills the frame, at every viewport size.
      scale: (l, root) => {
        const { width, height } = root.viewport(l)
        return [width, height, 1]
      },
    },
  ],
})
```

## Accessibility

A `<canvas>` has no accessible representation of what it draws, so a scene is an unlabelled graphic unless you name it. Give the canvas fallback content with `fallback` — assistive technology reads it the way it reads an image's `alt`:

```ts
three({
  fallback: "A 3D model of the product, rotating slowly",
  scene: [/* ... */],
})
```

The host `div` is yours, so anything else belongs there: `role`, `aria-describedby`, a visible caption, or keyboard controls next to the canvas. A scene whose content is essential — data a user has to read, a control they have to operate — needs that same information reachable outside the canvas too.

## JSX → Domphy

If you know `@react-three/fiber`, the translation is mechanical:

| JSX (`@react-three/fiber`) | Domphy (`@domphy/three`) |
| --- | --- |
| `<mesh position={[1, 2, 3]}>...</mesh>` | `{ mesh: [...], position: [1, 2, 3] }` |
| `<mesh onClick={handleClick} />` | `{ mesh: null, onClick: handleClick }` |
| `useFrame((state, delta) => { ... })` | `onFrame: (root, delta, self) => { ... }` on a scene node |
| `<primitive object={existingObject} />` | `{ primitive: [], object: existingObject }` |
| `extend({ MyClass }); <myClass />` | `extend({ MyClass }); { myClass: null }` |
| `useLoader(GLTFLoader, url)` | `loadAsset(GLTFLoader, url)` → `{ data, error, promise }` |

The first key of a scene object is its tag (the camelCase of a `THREE` class, or a name registered via `extend()`) — the three.js equivalent of core's "first key = HTML tag". Every other key is a prop.

## Scene doctor

`diagnose(options)` / `validate(options)` statically lint a `three()` option object — doctor cannot see a scene description because it is not a `DomphyElement`. Same contract shape as `@domphy/doctor`: `diagnose` returns `SceneDiagnostic[]`; `validate` adds `{ ok, issues, summary }` (`ok` is true when there are no error-severity issues). Options: `only` / `exclude` rule-id lists. Per-node suppression: `_doctorDisable: true | "rule-id" | string[]`.

| Rule | Severity |
| --- | --- |
| `unknown-tag` | error |
| `tag-not-first` | error |
| `invalid-child` | error |
| `legacy-light-intensity` | warning |
| `additive-blowout` | warning |
| `camera-missing-lookat` | warning |

```ts
import { diagnose, three, validate } from "@domphy/three"

const options = { scene: [{ mesh: [{ boxGeometry: null }] }] }
diagnose(options)
validate(options).ok
```

## Next steps

- [Scene Grammar](./grammar) — tags, `args`, `attach`, `primitive`, `dispose: null`, `_key`, the function-prop rules, pierced props, `extend()`
- [Events](./events) — raycast pointer events (`onClick`, `onPointerOver`, ...)
- [Animation & Loop](./animation) — `onFrame`, `frameloop` modes, `invalidate()`
- [Loading Assets](./assets) — `loadAsset`/`preloadAsset`/`clearAsset`
- [Recipes](./recipes) — OrbitControls, loaders, and other common patterns
- [Examples](./examples/spinning-cube) — full running scenes
