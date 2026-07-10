---
title: "@domphy/three — Spinning Cube"
description: "Hello-world scene: one mesh, onFrame rotation, two-point lighting — the first thing to read before writing a @domphy/three scene."
---

# Spinning Cube

<script setup lang="ts">
import SpinningCubeDemo from "../../demos/three/spinning-cube.ts?raw"
</script>

The smallest complete `@domphy/three` scene: a single `mesh` built from a tag + `args`, animated every frame with `onFrame`, lit by two lights against a deep slate backdrop. Start here before the [grammar](/docs/three/grammar) reference.

<CodeEditor :code="SpinningCubeDemo" />

## How it works

- **Tags**: `boxGeometry` and `meshStandardMaterial` are the camelCase names of `THREE.BoxGeometry`/`THREE.MeshStandardMaterial`, resolved by reflection — see [Grammar keys](/docs/three/grammar#grammar-keys). Their `attach` target (`"geometry"`/`"material"`) is inferred automatically from the `.isBufferGeometry`/`.isMaterial` flags.
- **`args`**: `{ boxGeometry: null, args: [1.4, 1.4, 1.4] }` passes constructor arguments to `new THREE.BoxGeometry(1.4, 1.4, 1.4)` — see [`args` reconstruction](/docs/three/grammar#args-reconstruction).
- **`onFrame`**: the `useFrame()` analog, called every rendered frame as `(root, delta, self)` — `self` is the mesh's `THREE.Mesh` instance. See [Animation & Loop](/docs/three/animation#onframe).
- **`root.clock`**: the float bob reads `root.clock.getElapsedTime()` from the shared `RootState` clock instead of a local time accumulator, so it stays correct across re-renders.
- **`onCreated`**: runs once after the renderer and scene exist, used here to set `root.scene.background`, add a matching `THREE.Fog` for depth (even at this small scale, fog keeps the cube from reading flat), and to `root.camera.lookAt(0, 0, 0)` — the camera never gets an explicit `rotation`, so it must be aimed at the cube by hand. A fixed background color inside the canvas is fine; Domphy's theme/doctor rules govern the DOM around the canvas, not the rendered scene itself.
- **Two-point lighting**: a warm `directionalLight` key from the front-right and a cool `pointLight` rim from behind separate the cube from the backdrop — `color` and `intensity` on both are applied directly (`color.set(...)` under the hood) — see [Duck-typed props](/docs/three/grammar#duck-typed-props).

[← Back to @domphy/three](/docs/three/)
