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

Peer dependencies: `@domphy/core` and `three >= 0.156.0`.

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
          mesh: [{ boxGeometry: null }, { meshStandardMaterial: { color: "orange" } }],
          "rotation-y": (l) => spin.get(l),   // pierced prop, reactive
        },
        { ambientLight: null, intensity: 0.5 },
      ],
    }),
  ],
}
```

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

## Next steps

- [Scene Grammar](./grammar) — tags, `args`, `attach`, `primitive`, `dispose: null`, `_key`, the function-prop rules, pierced props, `extend()`
- [Events](./events) — raycast pointer events (`onClick`, `onPointerOver`, ...)
- [Animation & Loop](./animation) — `onFrame`, `frameloop` modes, `invalidate()`
- [Loading Assets](./assets) — `loadAsset`/`preloadAsset`/`clearAsset`
- [Recipes](./recipes) — OrbitControls, loaders, and other common patterns
- [Examples](./examples/spinning-cube) — full running scenes
