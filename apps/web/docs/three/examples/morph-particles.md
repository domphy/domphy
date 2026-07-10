---
title: "@domphy/three — Morph Particles"
description: "An 8000-point cloud that morphs between a sphere, a torus knot, and a 3D spiral, each particle easing on its own staggered delay so the transition ripples across the cloud instead of snapping."
---

# Morph Particles

An 8000-point `points` cloud that auto-cycles between three target shapes — a sphere and a torus knot sampled straight from real `THREE` geometries' position attributes, and a parametric 3D spiral with no built-in geometry equivalent. Every particle eases toward the new target on its own delay, hashed from its index, so a shape switch ripples outward through the cloud over about a second and a half rather than every point snapping into place on the same frame. Color rides the same per-particle ease, lerping between each shape's assigned hue.

<script setup lang="ts">
import MorphParticlesDemo from "../../demos/three/morph-particles.ts?raw"
</script>

<CodeEditor :code="MorphParticlesDemo" />

## How it works

- **Sampling real geometry into a fixed-size target**: `sampleGeometryPositions` reads a `THREE.SphereGeometry`/`THREE.TorusKnotGeometry`'s `attributes.position.array` and walks it at evenly-spaced indices (`Math.floor((index / count) * vertexCount)`) rather than a contiguous slice — the sample spreads across the whole surface regardless of how the particle count compares to the source vertex count. The spiral target has no built-in geometry to sample from, so it's generated directly as a parametric shape of the same size.
- **One `bufferGeometry` with two live typed arrays**: `positions`/`colors` are the exact `Float32Array`s passed as `args` to `bufferAttribute` (`attach: "attributes-position"` / `"attributes-color"`) — `onFrame` mutates them in place and flips `needsUpdate`, the same live-buffer pattern as the [Wave Field](/docs/three/examples/wave-field) recipe's `InstancedMesh` matrix rewrite. See [Attach inference](/docs/three/grammar#attach-inference).
- **Per-particle stagger**: `hashUnit(index)` derives a deterministic pseudo-random `[0, 1)` value from each index (a cheap `sin`-based hash, no `Math.random` at runtime) and scales it into a delay up to `MAX_STAGGER` seconds. A particle's local progress is `(transitionElapsed - staggerDelays[index]) / EASE_DURATION`, clamped and run through `easeInOutCubic` — nearby indices land close in delay, but since particle index has no spatial meaning here, the "ripple" reads as a staggered shimmer through the cloud rather than a directional wave.
- **Interruptible transitions**: `beginTransition` snapshots whatever `positions`/`colors` currently hold — not necessarily a settled shape — into `fromPositions`/`fromColors` before retargeting. Clicking mid-transition restarts the ease from wherever the cloud actually is, with no visible snap.
- **`onFrame: (root, delta, self)`** drives a slow continuous spin (`self.rotation.y += delta * 0.05`, always on) plus the auto-cycle timer (`cycleElapsed >= CYCLE_INTERVAL` triggers the next `beginTransition`) and the per-vertex morph loop itself, only while a transition is in flight. See [Animation & Loop](/docs/three/animation#onframe).
- **`frameloop: "always"`**: both the idle spin and the auto-cycle timer are free-running, not driven by any `State` change, so `"demand"` (which only renders after `invalidate()`) would leave the cycle frozen. See [frameloop modes](/docs/three/animation#frameloop-modes).
- **Click-to-advance via an invisible bounds mesh**: a `sphereGeometry` mesh with `meshBasicMaterial({ transparent: true, opacity: 0 })` carries the `onClick` handler instead of the particles themselves — raycasting 8000 individual points on every pointer move would be wasteful, and `points` here has no pointer props at all so it's never registered as an interactive target. See [Excluding an object from raycasting](/docs/three/events#excluding-an-object-from-raycasting) and the [pointer event props](/docs/three/events#pointer-event-props) table for `onClick`.
- **Additive blending, per-shape hue**: `vertexColors: true` plus `blending: AdditiveBlending`, `depthWrite: false`, and `opacity: 0.85` is the same particle-cloud recipe as [Galaxy](/docs/three/examples/galaxy) — overlapping points brighten instead of occluding, and since color eases through the same staggered per-particle progress as position, the hue shift ripples in lockstep with the shape change.

[← Back to @domphy/three](/docs/three/)
