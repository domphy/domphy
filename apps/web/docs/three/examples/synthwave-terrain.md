---
title: "@domphy/three — Synthwave Terrain"
description: "A retro-futuristic wireframe grid with deterministic layered-noise hills that scroll toward the camera by re-sampling instead of moving, under a sliced gradient sun and a fogged, star-scattered sky."
---

# Synthwave Terrain

<script setup lang="ts">
import SynthwaveTerrainDemo from "../../demos/three/synthwave-terrain.ts?raw"
</script>

A magenta wireframe grid rolls with hills generated from a hand-written, dependency-free layered-noise function, endlessly scrolling toward the camera — not by moving the mesh, but by advancing the coordinate the noise is sampled at every frame and rewriting the geometry's position attribute in place. A gradient sun disc, sliced by a handful of horizontal cutouts, glows on the horizon above a fogged sky scattered with faint stars.

<CodeEditor :code="SynthwaveTerrainDemo" />

## How it works

- **Deterministic layered noise, no library**: `hash(x, y)` is a pure `Math.sin`-based hash over two integers (no `Math.random`, so it's reproducible), `valueNoise` bilinearly interpolates it across the unit grid, and `fractalNoise` sums three octaves of that at doubling frequency/halving amplitude — the standard fBm recipe, written out by hand instead of pulled from a noise package.
- **Scrolling by re-sampling, not moving**: the plane's transform never changes. Every `onFrame` advances `scrollOffset` and adds it to each vertex's local-depth coordinate before sampling the noise, so the *pattern* slides under the fixed mesh — no seams, no reset, no per-frame geometry reallocation. See [Animation & Loop](/docs/three/animation#onframe).
- **`primitive` for imperative geometry**: per-vertex position rewriting every frame isn't expressible through declarative `args`/props, so the animated `THREE.Mesh` is built up front and adopted via `{ primitive: null, object: terrain }` — the same recipe `wave-field.ts` uses for its per-instance matrix rewrites. See [`primitive`](/docs/three/grammar#primitive).
- **`needsUpdate` without `computeVertexNormals`**: the material is `wireframe: true` and unlit (`MeshBasicMaterial`), so it never reads vertex normals — only `positionAttribute.needsUpdate = true` is set after the rewrite, skipping the normal recompute a lit/shaded mesh would need.
- **Rotation maps local axes to world axes**: the plane is built flat (`PlaneGeometry`'s local X/Y/Z), then `rotation.x = -Math.PI / 2` on the mesh maps local Z (the axis the noise writes height into) to world Y (up) and local Y to world -Z (depth) — that's why `terrainHeight`'s second argument reads as "distance from camera" rather than a raw local coordinate.
- **The sun is a `CanvasTexture`, not a shader**: `circleGeometry` gets a `meshBasicMaterial` whose `map` is a 2D canvas — a vertical multi-stop gradient with a handful of growing horizontal bands punched out via `globalCompositeOperation = "destination-out"`, the classic "sliced sun" silhouette, built the same way `starfield-hero.ts` builds its glow sprite.
- **Selective `fog: false`**: the scene fog (`{ fog: null, args: [...] }`, `.isFog`-inferred attach) fades the terrain into the backdrop as designed, but the sun and star materials set `fog: false` — a light source above the haze and stars in open sky shouldn't dim with ground-level atmospheric distance the way the grid does. See [Attach inference](/docs/three/grammar#attach-inference).
- **`frameloop: "always"`**: the scroll is a free-running per-tick animation with nothing that ever calls `invalidate()`, so `"demand"` mode would render exactly one frame and freeze — see [frameloop modes](/docs/three/animation#frameloop-modes).

[← Back to @domphy/three](/docs/three/)
