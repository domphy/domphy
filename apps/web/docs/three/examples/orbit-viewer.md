---
title: "@domphy/three — Orbit Viewer"
description: "A metallic torus knot under three-point studio lighting, orbitable via extend()-registered OrbitControls, rendered on demand."
---

# Orbit Viewer

<script setup lang="ts">
import OrbitViewerDemo from "../../demos/three/orbit-viewer.ts?raw"
</script>

A metallic torus knot on a dark, fog-enveloped ground disc, lit by a colored three-point rig. It auto-rotates for a couple seconds after mount, then stops and goes idle — drag to orbit it yourself from there. The scene runs `frameloop: "demand"`, so it only renders while the camera is actually moving: during that opening auto-rotate sweep, or while OrbitControls' damping is still settling a drag.

<CodeEditor :code="OrbitViewerDemo" />

## How it works

- `OrbitControls` lives outside the `three` core namespace, so it's registered once via [`extend()`](/docs/three/grammar#extend-custom-classes) and used as the `orbitControls` tag.
- `args: (l, root) => [root.camera, root.canvas]` resolves lazily against the live root — the camera and canvas don't exist until the scene mounts, so `args` can't be a plain array here. See [`args` reconstruction](/docs/three/grammar#args-reconstruction).
- `onChange` isn't a property on `OrbitControls`, so it dispatches through the [function-prop rules](/docs/three/grammar#function-prop-rules)' `addEventListener` fallback — it fires on every camera move, including the damped tail after a drag ends and every step of the opening auto-rotate sweep.
- `onFrame: (root, delta, self) => self.update()` is the `useFrame()` analog — it drives the controls' damping and auto-rotate every rendered frame, and flips `autoRotate` back off once `autoRotateElapsed` passes 2.5s. See [Animation & Loop](/docs/three/animation).
- `frameloop: "demand"` plus `root.invalidate()` inside `onChange` is what keeps the render loop asleep until there's actually camera motion to draw — see [`invalidate()`](/docs/three/animation#invalidate). The brief startup auto-rotate rides that same path; once it turns itself off, the scene is idle again exactly like before.
- `{ color: null, attach: "background", args: [...] }` and the inferred `fog` attach (`.isFog`) set scene-level state through the same `attach` mechanism used for geometry/material — see [Attach inference](/docs/three/grammar#attach-inference).
- The ground disc (`circleGeometry` + `meshStandardMaterial`) sits below the knot at `position: [0, -1.5, 0]`; the same `fog` already on the scene dissolves its edge into the backdrop instead of a hard silhouette.

[← Back to @domphy/three](/docs/three/)
