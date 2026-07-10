---
title: "@domphy/three — Neon Bloom"
description: "Three precessing neon-wireframe rings and a floating icosahedron on a near-black backdrop, post-processed with UnrealBloomPass via a hand-built EffectComposer that takes over the render loop."
---

# Neon Bloom

<script setup lang="ts">
import NeonBloomDemo from "../../demos/three/neon-bloom.ts?raw"
</script>

Three wireframe torus rings — magenta, cyan, and yellow — precess slowly around a floating low-poly icosahedron on a near-black backdrop, run through `UnrealBloomPass` so their bright, unlit wireframe pixels glow. The composer is built imperatively in `onCreated` and registered with `root.frame(callback, 1)`: priority `1` is **render takeover**, the r3f-parity feature that hands `gl.render` off to your own callback for the rest of the root's life.

<CodeEditor :code="NeonBloomDemo" />

## How it works

- **Postprocessing enters through `extend()`**: `EffectComposer`, `RenderPass`, and `UnrealBloomPass` all live under `three/addons/postprocessing/`, outside the package's core namespace, so they're registered with `extend({ EffectComposer, RenderPass, UnrealBloomPass })` — see [`extend()` custom classes](/docs/three/grammar#extend-custom-classes). None of the three ever become a scene *tag* here, though — `EffectComposer` isn't an `Object3D`, so it has no natural place in `scene`; it's built with plain `new` inside `onCreated` instead.
- **Render takeover via `root.frame(callback, priority)`**: `onCreated` calls `root.frame((root, delta) => composer.render(delta), 1)` directly, rather than going through a scene node's `onFrame`/`onFramePriority` props — the composer has no node of its own to hang them on. Once *any* registered frame callback has `priority > 0`, the root stops calling its own `gl.render(scene, camera)` every tick; `composer.render()` becomes the only thing that draws a pixel. See [Priority / render takeover](/docs/three/animation#priority).
- **Resize handled with a bare `effect()`**: `root.size` is a reactive `State<SizeState>` — a plain `effect(() => { const { width, height } = root.size.get(); composer.setSize(width, height) })` auto-tracks that read and re-runs on every resize, keeping `UnrealBloomPass`'s internal render targets in step with the canvas, no manual `ResizeObserver` needed. See [`effect()`](/docs/three/animation#onframe-vs-reactive-props) for the same auto-tracking idiom used by reactive props.
- **Unlit neon, lit everything else**: the rings use `meshBasicMaterial` with `wireframe: true` — deliberately unaffected by scene lighting, so bloom always has clean, saturated pixels to work with regardless of the light rig. The icosahedron is a normally-lit `meshStandardMaterial`, and each ring carries its own colored `pointLight` as a *child* (nested inside its own `mesh` array) so the light rides the ring's transform and spills that hue across the icosahedron and the fog as the rings precess.
- **Precession, not just spin**: each ring's `onFrame` increments `rotation.x` and `rotation.y` by a different per-ring speed every frame — the ring's own tilt axis keeps drifting over time instead of settling into a flat, predictable spin, the same "wandering gyroscope" look real precessing rings have.
- **`root.gl` vs. `THREE.WebGLRenderer`**: `three()`'s `RootState.gl` is typed as the minimal [`RendererLike`](/docs/three/recipes#injectable-renderer) contract, not the concrete `WebGLRenderer` class `EffectComposer`'s constructor expects — the demo casts once at that boundary. The default renderer really is a `WebGLRenderer`, so it's safe at runtime; a custom `createRenderer` swapped in for something non-WebGL (WebGPU, a test stub) would need its own composer strategy.

[← Back to @domphy/three](/docs/three/)
