---
title: "@domphy/three — Tunnel"
description: "An infinite flight through a warped CatmullRomCurve3 tube — camera position and orientation driven each frame by curve.getPointAt(), colored point lights seated on the path, a scrolling wireframe overlay for motion legibility, and onWheel-adjustable speed."
---

# Tunnel

<script setup lang="ts">
import TunnelDemo from "../../demos/three/tunnel.ts?raw"
</script>

A closed `CatmullRomCurve3` loop — radius and height both wobbling at different frequencies — extruded into a `TubeGeometry` rendered `BackSide` so the camera flies through its interior. There's no orbiting or dragging here: the camera's position and look-at target are both computed from the curve every frame, so it just flies the loop forever. Five point lights seated directly on the path wash the walls in alternating violet/cyan/magenta as the camera passes them, and a second wireframe-only copy of the same tube geometry gives the corridor a scrolling grid so speed and curvature stay legible. Scroll over the canvas to speed up or slow down the flight.

<CodeEditor :code="TunnelDemo" />

## How it works

- **The path**: `flightPath = new CatmullRomCurve3(pathPoints, true, ...)` — the `true` closes the loop. `pathPoints` isn't a circle; radius and height each vary by a different sine/cosine frequency so the tube reads as an organic warped corridor.
- **Camera path animation**: the tube mesh's `onFrame: (root, delta) => {...}` advances `flightPosition` (a loop-fraction, `0..1`) by `delta * speed` each frame, places `root.camera.position` at `flightPath.getPointAt(flightPosition)`, and calls `root.camera.lookAt(...)` at a point a little further ahead on the curve (`LOOK_AHEAD`) — that's what keeps the camera always facing its direction of travel through the bends. See [Animation & Loop](/docs/three/animation#onframe).
- **`onWheel`**: attached to the tube mesh itself, since the camera is always inside it — the tube is the one surface guaranteed to be under the pointer. Per the [function-prop rules](/docs/three/grammar#function-prop-rules), `onWheel` is a raycast pointer event, so the handler receives a `ThreeEvent<WheelEvent>` with `deltaY` copied straight onto it; the handler clamps `speed` into `[SPEED_MIN, SPEED_MAX]` and calls `event.nativeEvent.preventDefault()` so the wheel doesn't also scroll the docs page underneath the canvas. See [Events](/docs/three/events#pointer-event-props).
- **Two tubes, one geometry shape**: the visible corridor is a `meshStandardMaterial` (`side: BackSide`) tube for the lit surface, and a sibling `mesh` node builds a second `TubeGeometry` from the *same* `args` values with a `wireframe: true, transparent: true` `meshBasicMaterial` layered on top — a cheap way to get a scrolling grid overlay for motion legibility without hand-building line geometry.
- **Lights on the path**: `tunnelLights` maps 5 colors to `flightPath.getPointAt(index / 5)` positions and spreads them into `scene` — plain `pointLight` nodes at physical intensities (`70`, `distance: 10`, `decay: 2`), so each one only lights the stretch of tube nearby before falling off.
- **Fog matches the backdrop**: `{ fog: null, args: [BACKDROP_COLOR, 8, 30] }` (inferred `attach` via `.isFog`) uses the same color as `scene.background`, so the tunnel dissolves into the void a short way ahead instead of cutting off hard. See [Attach inference](/docs/three/grammar#attach-inference).
- **Initial camera framing**: `camera: { position: [...], fov: 80, near: 0.05, far: 60 }` starts the camera at `flightPath.getPointAt(0)` with a wide FOV suited to flying through a tight corridor, and `onCreated` sets the initial `lookAt` so the first rendered frame already faces down the path, before the first `onFrame` tick runs.

[← Back to @domphy/three](/docs/three/)
