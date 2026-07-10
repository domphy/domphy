---
title: "@domphy/three — Cursor Particles"
description: "6000 particles drifting on a flat disc, repelled by the pointer through a spring/damping system stored in Float32Arrays, glowing brighter the further they're displaced, rendered as additive soft-round sprites from a CanvasTexture."
---

# Cursor Particles

A disc of 6,000 points, each idling in a small slow orbit around its own home position. Move the pointer over the scene and nearby points get pushed away, brightening as they go, then ease back — a damped spring, not a snap — once the pointer moves on. The dots are additive soft-round sprites baked from a `CanvasTexture` radial gradient, colored on a blue-to-violet hue ramp by distance from center, over a deep near-black backdrop.

<script setup lang="ts">
import CursorParticlesDemo from "../../demos/three/cursor-particles.ts?raw"
</script>

<CodeEditor :code="CursorParticlesDemo" />

## How it works

- **Pointer-to-world, without touching `root.raycaster` directly**: an invisible `mesh` (a `planeGeometry` lying flat at `y=0`, `meshBasicMaterial` with `opacity: 0`) sits under the whole disc purely to catch `onPointerMove`. Its `ThreeEvent.point` field is already the world-space raycast hit — no manual NDC/unproject math needed. See [Events](/docs/three/events#the-threeevent-shape).
- **`onPointerOut`** on that same plane flips a `pointerActive` flag off, so repulsion stops the instant the cursor leaves the disc (or the canvas) instead of freezing the last known position forever.
- **Per-point damped spring, in plain `Float32Array`s**: `velocityX`/`velocityZ` and `displacementX`/`displacementZ` are module-level typed arrays, one slot per particle. Each frame: the pointer (if active and within `REPEL_RADIUS`) adds an outward velocity kick; a spring term (`-displacement * SPRING`) pulls that velocity back toward zero; a damping multiplier bleeds it off. Integrating velocity into displacement and adding it to a drifting home position is what makes a repelled point ease back instead of snapping.
- **Glow from displacement**: each point's color is its base hue-ramp color (`#86b1ff` near the center to `#e0aaff` at the rim, via `Color.lerp`) mixed toward white by how far it's currently displaced — no separate "glow" attribute, just the same spring math driving both position and color.
- **`self.geometry.attributes.position.needsUpdate = true`** (and the matching `color` attribute) every `onFrame`, at 6,000 points — the same `bufferGeometry`/`bufferAttribute` wiring as a static particle cloud (see [`args` reconstruction](/docs/three/grammar#args-reconstruction)), but mutated and re-uploaded every tick instead of written once. See [Animation & Loop](/docs/three/animation#onframe).
- **Soft round sprites**: `pointsMaterial.map` is a plain `CanvasTexture` — a 64×64 canvas filled with `createRadialGradient`, no image asset. Assigning it is a duck-typed [static prop](/docs/three/grammar#duck-typed-props): `map` has no `.set`/`.copy` on a fresh material, so it falls through to direct assignment.
- **Additive blending**: `blending: AdditiveBlending`, `depthWrite: false`, `transparent: true` — overlapping sprites brighten instead of occluding, same recipe as the [Galaxy](/docs/three/examples/galaxy) particle cloud.
- **`frameloop: "always"`**: the idle drift alone requires continuous rendering — nothing here is purely reactive-prop-driven, so `"demand"` would leave the disc static between pointer moves. See [frameloop modes](/docs/three/animation#frameloop-modes).

[← Back to @domphy/three](/docs/three/)
