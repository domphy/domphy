---
title: "@domphy/blocks — globe3D"
description: "Genuinely functional real-time WebGL1 pipeline (hand-rolled — cobe, this package's other dependency, only renders the separate dot-matrix globe style and has..."
---

# globe3D

<script setup lang="ts">
import Globe3DDemo from "../demos/blocks/globe3D.ts?raw"
</script>

A **Effects 3D** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `globe3D()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Globe3DDemo" />

::: details Implementation notes
Genuinely functional real-time WebGL1 pipeline (hand-rolled — cobe, this package's other dependency, only renders the separate dot-matrix globe style and has no textured-sphere API, and three.js/a scene-graph library isn't in this package's pre-approved dependency list): a generated lat/long sphere mesh, diffuse + fresnel-rim 'atmosphere' shader, manual mat4 camera math, drag-to-orbit, wheel-to-zoom (clamped), continuous auto-rotate that pauses while dragging, and per-frame marker re-projection to 2D screen space driving avatar-image DOM markers + a hover tooltip. Marked 'partial' for two honest, spec-relevant gaps: (1) the default texture (used whenever baseTextureUrl isn't supplied) is a procedurally-painted ocean+blob-continent placeholder, not a real photographic/DEM Earth texture — the spec explicitly wants a 'photographic' read, which needs a real texture asset this clean-room, zero-network-by-default component doesn't ship; real texture/bump URLs ARE supported via props and swap in correctly when provided. (2) the 'bump map' is a diffuse-shading multiplier (bump texture's red channel darkens/brightens the lit hemisphere), not true per-pixel normal perturbation — WebGL1 core has no derivatives without the OES_standard_derivatives extension. Both gaps and the reasoning are documented in the file's own header comment. All interaction (orbit/zoom/markers/tooltip/auto-rotate) and the lighting/atmosphere shader are fully real, not stubbed — only visual texture fidelity is capped below 'photographic'.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/3d-globe)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/effects-3d/globe3D.ts [globe3D]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
