---
title: "@domphy/three — Dissolve"
description: "A torus knot dissolving and reforming in a loop via a custom shaderMaterial — a 3D-noise threshold discards fragments and glows hot along the boundary, with a point cloud hugging the surface that brightens where the edge passes."
---

# Dissolve

A metallic-dark torus knot that dissolves and reforms on an endless loop, driven entirely by a hand-written `shaderMaterial`: a 3D noise field is compared against an animated threshold uniform — fragments below it vanish (`discard`), fragments near the boundary glow from a warm orange core out to a hot near-white edge. A second `points` layer sits on the exact same geometry, faint everywhere except right where the dissolve line is currently sweeping past, so the effect reads as a boundary traveling through a volume rather than a screen-space wipe.

<script setup lang="ts">
import DissolveDemo from "../../demos/three/dissolve.ts?raw"
</script>

<CodeEditor :code="DissolveDemo" />

## How it works

- **`shaderMaterial` via `args`**: neither the mesh nor the points material is a named `THREE` material — `{ shaderMaterial: null, args: [{ vertexShader, fragmentShader, uniforms, ... }] }` passes a single options object straight to `new THREE.ShaderMaterial(...)`, the same [`args` reconstruction](/docs/three/grammar#args-reconstruction) mechanism every other example uses for geometry constructor args.
- **Uniform objects, not reactive props**: `uniforms` is a plain `{ uTime: { value }, uThreshold: { value }, ... }` map handed to the constructor once. Nothing here goes through a `State` — see [duck-typed props](/docs/three/grammar#duck-typed-props) for the one special case (`ShaderMaterial.uniforms` merges per-named-uniform in place if you *do* re-apply it as a prop, which this example doesn't need).
- **Driving the threshold from `onFrame`**: `onFrame: (root, delta, self) => { self.material.uniforms.uThreshold.value = ... }` — `self` is this node's own `THREE.Mesh`/`THREE.Points` instance, so `self.material` is the exact `ShaderMaterial` that was attached, and mutating `.uniforms.<name>.value` writes straight into the compiled program without re-creating anything. This is [rule 2](/docs/three/grammar#function-prop-rules) (`onFrame`), the `useFrame()` analog — see [Animation & Loop](/docs/three/animation#onframe).
- **One threshold formula, two independent `onFrame` callbacks**: the mesh's and the points' `onFrame` each read `root.clock.getElapsedTime()` and compute the same `dissolveThreshold(elapsed)` sine wave independently — no shared mutable state needed, they just agree by construction, which is what keeps the discard boundary and the glowing points in lockstep.
- **`discard` + edge glow**: the fragment shader samples a 3D value-noise field (hash + trilinear smoothstep, with a cheap 2-octave `fbm` on top) at each fragment's object-space position, compares it to `uThreshold`, and `discard`s anything below it. Fragments that survive but sit close to the boundary blend from `uGlowOuter` (`#ff7a3c`) to `uGlowInner` (`#ffffdd`) over the backdrop `#0a0c14` — a Fresnel-free half-lambert (`dot(normal, lightDir) * 0.5 + 0.5`) keeps the surviving shell reading as a solid past the edge.
- **Points hugging the surface**: the point cloud reuses the *same* `torusKnotGeometry` `args`, so every point sits exactly on the mesh's surface. Its vertex shader runs the identical noise sample and sets `vGlow = 1 - clamp(abs(density - uThreshold) / uEdgeWidth, 0, 1)` — symmetric around the boundary rather than gated by `discard` — so points brighten and grow (`gl_PointSize`) as the dissolve line sweeps past them from either side, then fade back to a faint base color.
- **`side: DoubleSide`** on the mesh material keeps the torus knot's inner tube wall visible through the holes `discard` punches in it, instead of showing flat backdrop where a face got backface-culled.
- **`onCreated`** sets `root.scene.background` once, and calls `root.camera.lookAt(0, 0, 0)` because the camera sits off-axis at `[3.4, 1.8, 3.6]` — same pattern as every other off-center camera on this site.

[← Back to @domphy/three](/docs/three/)
