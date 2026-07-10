---
title: "@domphy/three — glTF Viewer"
description: "A loaded glTF duck grounded by a soft contact shadow under hemisphere + directional stage lighting, auto-orbiting into view via extend()-registered OrbitControls, with a spinning wireframe placeholder while the asset loads."
---

<script setup lang="ts">
import GltfViewerDemo from "../../demos/three/gltf-viewer.ts?raw"
</script>

# glTF Viewer

A model loaded with `loadAsset` and adopted via `primitive`, staged under a hemisphere + two-point directional rig on a dark, fog-enveloped backdrop, orbitable via `extend()`-registered OrbitControls. Until the asset resolves, the same scene slot holds a spinning wireframe placeholder instead of a blank canvas.

<CodeEditor :code="GltfViewerDemo" />

Duck model © Khronos Group [`glTF-Sample-Assets`](https://github.com/KhronosGroup/glTF-Sample-Assets).

## How it works

- `loadAsset(GLTFLoader, "/models/Duck.glb")` returns an `AssetResult` immediately; `duck.data.get(l)` inside `scene` is `null` until the load resolves — see [Loading Assets](/docs/three/assets#loadasset).
- **Conditional scene children.** The same array slot is a ternary: a spinning wireframe icosahedron while `gltf` is falsy, the loaded `primitive` once it isn't. A different tag at the same position means the reconciler disposes the placeholder and mounts the model fresh — see [Reconcile semantics](/docs/three/grammar#reconcile-semantics).
- `{ primitive: null, object: gltf.scene }` adopts the loader's own `Object3D` instead of constructing one — never disposed by the reconciler, so re-loading or unmounting the demo doesn't touch the cached asset. See [`primitive`](/docs/three/grammar#primitive).
- `onUpdate: fitDuck` (rule 3 of the [function-prop rules](/docs/three/grammar#function-prop-rules)) runs after every props application on the `primitive` node — used here to measure the loaded model's bounding box once and normalize its scale/ground position, since raw glTF assets carry whatever scale they were authored at.
- `hemisphereLight` + a warm key / cool rim `directionalLight` pair is the "stage" rig — `attach` inference resolves `color`/`fog` at the top of `scene` onto `root.scene.background`/`root.scene.fog` the same way a mesh child's geometry/material infers its `attach`. See [Attach inference](/docs/three/grammar#attach-inference).
- `args: (l, root) => [root.camera, root.canvas]` on `orbitControls` resolves lazily against the live root — see [`args` reconstruction](/docs/three/grammar#args-reconstruction) — and `onFrame: (root, delta, self) => self.update()` drives its damping every rendered frame, the `useFrame()` analog documented in [Animation & Loop](/docs/three/animation).
- `frameloop: "always"` (rather than the `"demand"` mode [Orbit Viewer](/docs/three/examples/orbit-viewer) uses) because the loading-state placeholder spins continuously through `onFrame` — a time-based animation that doesn't self-sustain under `"demand"` unless something keeps calling `invalidate()`. See [frameloop modes](/docs/three/animation#frameloop-modes).
- The starting camera position (`CAMERA_START`) is chosen so the duck's face, not the back of its head, is the resting frame — `FRONT_AZIMUTH` is derived from that same constant with `Math.atan2`, then `orbitControls`' `minAzimuthAngle`/`maxAzimuthAngle` clamp `autoRotate`'s idle drift to ±40° around it, so the camera can never wander around to the shapeless rear view on its own.
- A small canvas-generated radial-gradient texture (`createContactShadowTexture`) drives a second, transparent `circleGeometry` mesh just above the ground disc — a cheap soft contact shadow that reads as depth/grounding without a real shadow map.
- The host `div` renders a second child: an absolutely positioned, `pointerEvents: "none"` overlay with a `radial-gradient` `backgroundImage` vignette, painted above the plain (non-positioned) canvas by CSS stacking order alone — same technique as [Starfield Hero](/docs/three/examples/starfield-hero).

[← Back to @domphy/three](/docs/three/)
