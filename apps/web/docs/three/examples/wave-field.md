---
title: "@domphy/three — Wave Field"
description: "A 400-box InstancedMesh animated as a traveling sine wave in onFrame, colored by a per-instance blue-to-magenta HSL ramp keyed to wave height, with fog and a dark cinematic backdrop."
---

<script setup lang="ts">
import WaveField from "../../demos/three/wave-field.ts?raw"
</script>

# Wave Field

A field of 400 boxes rigged as one `InstancedMesh`, displaced every frame by a traveling sine wave computed in `onFrame` — the kind of per-tick math at scale that only makes sense outside the declarative props grammar. A low, raking camera skims across the grid so the wave reads as motion rather than a static height-map, each instance is tinted by a blue-to-magenta HSL ramp keyed to its current height, and fog matched to the dark backdrop turns it into the classic "wow shot."

<CodeEditor :code="WaveField" />

## How it works

- **`primitive` adopts an imperative core.** Per-instance matrices at 400-instance granularity aren't expressible through `args`/props, so the `InstancedMesh` is built with three's own API and mounted via [`{ primitive: null, object: field }`](../grammar#primitive) — never disposed by the reconciler, the demo owns its lifecycle.
- **`onFrame: (root, delta, self) => ...`** runs the wave math every rendered frame, with `self` bound to the adopted instance — see [Animation & Loop](../animation#onframe). Precomputing each instance's x/z once and only touching y (and the color derived from it) per tick keeps the per-frame loop to one `sin`/`cos`/`setHSL` pass per box.
- **`frameloop: "always"`** is set explicitly, not left to the default: the wave is continuous, time-based motion with no `State` behind it, so `"demand"` would never call `invalidate()` and the field would freeze on the first frame. See [`onFrame` vs. reactive props](../animation#onframe-vs-reactive-props).
- **A low, raking camera reads the wave as motion.** The camera sits outside one edge of the grid at `[0, 8, 20]`, `lookAt`-ing a point past the far edge — roughly a 17° angle off the horizon — instead of looking straight down. A top-down view of a height field reads as a static bump map; skimming across it low makes the traveling crest and trough visibly move through the frame.
- **The height ramp is per-instance color, not lighting.** Every tick, each instance's `y` maps to a blue-to-magenta HSL tint (`hsl(200, 70%, 55%)` at the trough to `hsl(320, 80%, 65%)` at the peak) via `InstancedMesh.setColorAt()`. The material is unlit (`MeshBasicMaterial`) on purpose: on a lit material, `setColorAt`'s tint multiplies into the diffuse term, and the cool/dark end of the ramp collapsed toward black at grazing light angles — a real rendering defect, reproduced on GPU hardware, not just headless/CI. An unlit material renders `instanceColor` as-is, so the ramp stays legible everywhere in the field — which is also why this scene carries no lights.
- **`attach` inference on `fog`.** The `{ fog: null, args: [...] }` node has no explicit `attach` — its `.isFog` flag infers `"fog"`, and since this node sits at the top of `scene`, that attaches straight onto `root.scene.fog`. Same inference rule a mesh's geometry/material children use — see [Attach inference](../grammar#attach-inference). Its color matches `root.scene.background` so the back rows dissolve into the backdrop instead of into a visibly different rectangle.
- **`onCreated`** points the camera at the field and sets `root.scene.background` — a one-time setup step that runs once the root exists, documented in the [`ThreeOptions`](../grammar) contract.

[← Back to @domphy/three](/docs/three/)
