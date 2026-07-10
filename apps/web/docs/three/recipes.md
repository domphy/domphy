---
title: "Recipes"
description: "Common @domphy/three patterns — OrbitControls via extend(), injectable createRenderer with a WebGPU sketch, theme-aware material colors via themeColorToken, and primitive for imperative cores."
---

<script setup lang="ts">

import OrbitControlsDemo from "../demos/three/OrbitControlsDemo.ts?raw"
import CustomRenderer from "../demos/three/CustomRenderer.ts?raw"
import ThemeColor from "../demos/three/ThemeColor.ts?raw"
import InstancedPrimitive from "../demos/three/InstancedPrimitive.ts?raw"
</script>

# Recipes

Patterns for things outside the `three` core namespace, or outside the declarative scene grammar.

## OrbitControls

`OrbitControls` isn't part of `three`'s core namespace, so `@domphy/three` never imports it — it enters user-land through `extend()`:

<CodeEditor :code="OrbitControlsDemo" />

`args` is a function here (rather than a plain array) because it needs the live root — the camera and canvas don't exist until the scene mounts. `onFrame` calls `self.update()` every rendered frame, which `enableDamping` needs to animate the deceleration.

The same recipe applies to any other `three/addons` helper (`TransformControls`, `DragControls`, ...): `extend({ TheClass })`, then use its camelCase tag.

## Injectable renderer

`three()`'s `createRenderer?: (canvas) => RendererLike` option replaces the default `new THREE.WebGLRenderer({ canvas, antialias: true, ...gl })` entirely — only `render()`/`setSize()` are required, everything else (`setPixelRatio`, `dispose`, `domElement`, `shadowMap`, `toneMapping`, `outputColorSpace`) is optional:

<CodeEditor :code="CustomRenderer" />

### WebGPU sketch

`RendererLike` is synchronous (`(canvas) => RendererLike`), but `WebGPURenderer` needs an async `.init()` before its first `render()` call. Wrap it so the contract stays synchronous while `render()` no-ops until the GPU adapter is ready:

```ts
import { WebGPURenderer } from "three/webgpu"
import type { RendererLike } from "@domphy/three"

function createWebGPURenderer(canvas: HTMLCanvasElement): RendererLike {
  const renderer = new WebGPURenderer({ canvas, antialias: true })
  let ready = false
  renderer.init().then(() => {
    ready = true
  })

  return {
    render(scene, camera) {
      if (ready) renderer.render(scene as any, camera as any)
    },
    setSize(width, height) {
      renderer.setSize(width, height)
    },
    setPixelRatio(ratio) {
      renderer.setPixelRatio(ratio)
    },
    dispose() {
      renderer.dispose()
    },
    domElement: renderer.domElement,
  }
}
```

Pass `createWebGPURenderer` as `three()`'s `createRenderer`. Frames rendered before `.init()` resolves are silently skipped (`root.invalidate()` from resize/prop updates still requests them, so nothing is missed once the adapter comes up) — the loop keeps calling `render()` every tick regardless.

## Theme-aware colors

`themeColorToken(listener, tone, color)` returns a concrete hex string instead of a `var(--…)` CSS reference — exactly what a `THREE.Color`-backed prop like `material.color` needs:

<CodeEditor :code="ThemeColor" />

`@domphy/three`'s own listeners (scene functions, reactive props) aren't attached to a DOM node, so passing one to `themeColorToken` can't track a live theme toggle — pass `null` and it resolves against the light theme once, the same idiom `@domphy/chart` uses for its own canvas colors (`seriesHex`/`familyHex`). To follow an actual dark-mode switch, resolve the color from a real DOM listener instead (a reactive `style` callback has one) and push it into an outer `State<ThreeOptions>`'s `scene` — `three()` re-applies `scene` whenever that state changes.

## `primitive` for imperative cores

`{ primitive: null, object: existingInstance }` adopts an object you built yourself — per-instance transforms via `InstancedMesh.setMatrixAt`, a physics engine's rigid-body mesh, anything the declarative `args`/props grammar can't express. It's never disposed by the reconciler (implicit `dispose: null`), so the instance keeps whatever lifecycle its own library gave it:

<CodeEditor :code="InstancedPrimitive" />

`onFrame` still works on a `primitive` node exactly like any other scene node — `self` is the adopted instance.
