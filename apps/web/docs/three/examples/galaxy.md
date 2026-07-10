---
title: "@domphy/three — Galaxy"
description: "A 15k-point spiral galaxy built from raw bufferGeometry/bufferAttribute nodes, colored warm-core to cool-rim via vertexColors, with additive blending, a faint background starfield, and slow continuous rotation."
---

# Galaxy

A `points` cloud of 15,000 particles arranged into spiral branches, colored on a warm-core to cool-rim gradient and blended additively into a deep-space backdrop, with a second sparse `points` layer as a faint distant starfield for scale contrast. Unlike every other example on this site, the geometry isn't built from `args` on a named `THREE` geometry class — it's raw `Float32Array` position/color buffers wired straight onto a `bufferGeometry` through explicit `attach` paths.

<script setup lang="ts">
import GalaxyDemo from "../../demos/three/galaxy.ts?raw"
</script>

<CodeEditor :code="GalaxyDemo" />

## How it works

- **`bufferGeometry` + `bufferAttribute`**: the geometry has no constructor args at all — its `attributes.position`/`attributes.color` are set by two `bufferAttribute` children, each `args: [typedArray, itemSize]` matching `new THREE.BufferAttribute(array, itemSize)`. See [`args` reconstruction](/docs/three/grammar#args-reconstruction).
- **Explicit `attach` paths**: `bufferAttribute` has no `.isX` flag for [attach inference](/docs/three/grammar#attach-inference) to key off, so `attach: "attributes-position"` / `"attributes-color"` is always explicit — resolved relative to the *direct* parent instance (the `bufferGeometry`), not the grandparent `points`. See [Grammar keys](/docs/three/grammar#grammar-keys).
- **`vertexColors: true`** on `pointsMaterial` tells the material to read per-vertex color from that `color` attribute instead of a single flat `material.color` — a plain boolean prop applied through the usual [duck-typed props](/docs/three/grammar#duck-typed-props) path.
- **Additive blending, capped**: `blending: AdditiveBlending` (imported straight from `three`) plus `depthWrite: false` and `transparent: true` is the standard particle-cloud recipe — overlapping points brighten instead of occluding each other, which is what makes the core glow. `opacity: 0.82` caps how far that stacking can climb, so the densest core reads warm instead of blowing out to flat white.
- **Background starfield**: a second `points` sibling in `scene` (no `vertexColors`, a single flat `color: "#9fb4ff"`, `opacity: 0.35`, no additive blending) scatters ~900 points on a distant shell around the galaxy — a cheap depth cue that needs none of the teaching machinery of the main cloud.
- **`onFrame: (root, delta, self)`** rotates the galaxy `points` object slowly and continuously (visible arm sweep/parallax against the static starfield) and also drifts `root.camera.position` in a small sine orbit, re-calling `root.camera.lookAt(0, 0, 0)` every frame — see [Animation & Loop](/docs/three/animation#onframe).
- **Camera angle**: `camera: { position: [0, 3, 6.5] }` sits about 25° above the galactic plane (`atan(3 / 6.5) ≈ 25°`) rather than dead top-down, so both the spiral arms and the disc's thickness read.
- **`onCreated`** sets `root.scene.background` once, up front — a fixed cinematic backdrop lives inside the canvas, so doctor's DOM theme-color rules don't apply to it. See the [`ThreeOptions` contract](/docs/three/grammar).

[← Back to @domphy/three](/docs/three/)
