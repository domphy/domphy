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

## Props

| Prop | Type | Description |
|---|---|---|
| `markers` | `Globe3DMarker[]` | Pinned marker locations. Defaults to a handful of major-city reference points. |
| `diameterUnits` | `number` | Container max diameter, in `themeSpacing` units. Defaults to `100` (~25em). |
| `baseTextureUrl` | `string` | Real Earth-texture image URL. When omitted, a procedural placeholder texture is generated instead. |
| `bumpTextureUrl` | `string` | Bump/height-map image URL (red channel used as a diffuse-shading multiplier). When omitted, a procedural placeholder is generated instead. |
| `ambientIntensity` | `number` | Ambient (unlit-side) light floor, 0-1. Defaults to `0.5`. |
| `lightIntensity` | `number` | Directional light strength, 0-1+. Defaults to `0.9`. |
| `lightDirection` | `[number, number, number]` | Directional light vector (world space, points FROM the surface TOWARD the light). Defaults to `[0.6, 0.5, 0.7]`. |
| `atmosphereColor` | `ThemeColor` | Theme color family for the fresnel-rim atmosphere glow. Defaults to `"info"`. |
| `atmosphereIntensity` | `number` | Atmosphere glow strength, 0-1+. Defaults to `0.9`. |
| `autoRotate` | `boolean` | Continuous idle auto-rotation. Defaults to `true`. |
| `rotationSpeed` | `number` | Auto-rotation speed, radians/frame. Defaults to `0.0016`. |
| `minZoomDistance` | `number` | Closest allowed camera distance (zoom in limit). Defaults to `1.7`. |
| `maxZoomDistance` | `number` | Farthest allowed camera distance (zoom out limit). Defaults to `4.5`. |
| `initialZoomDistance` | `number` | Starting camera distance. Defaults to `2.6`. |
| `wireframe` | `boolean` | Renders the raw triangle mesh (debug aid) instead of the shaded sphere. Defaults to `false`. |
| `onMarkerHover` | `(marker: Globe3DMarker \| null) =&gt; void` | Fired when a marker gains/loses hover (`null` on loses-hover). |
| `onMarkerClick` | `(marker: Globe3DMarker, event: PointerEvent) =&gt; void` | Fired when a marker is clicked. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Genuinely functional real-time WebGL1 pipeline (hand-rolled — cobe, this package's other dependency, only renders the separate dot-matrix globe style and has no textured-sphere API, and three.js/a scene-graph library isn't in this package's pre-approved dependency list): a generated lat/long sphere mesh, diffuse + fresnel-rim 'atmosphere' shader, manual mat4 camera math, drag-to-orbit, wheel-to-zoom (clamped), continuous auto-rotate that pauses while dragging, and per-frame marker re-projection to 2D screen space driving avatar-image DOM markers + a hover tooltip. Marked 'partial' for two honest, spec-relevant gaps: (1) the default texture (used whenever baseTextureUrl isn't supplied) is a procedurally-painted ocean+blob-continent placeholder, not a real photographic/DEM Earth texture — the spec explicitly wants a 'photographic' read, which needs a real texture asset this clean-room, zero-network-by-default component doesn't ship; real texture/bump URLs ARE supported via props and swap in correctly when provided. (2) the 'bump map' is a diffuse-shading multiplier (bump texture's red channel darkens/brightens the lit hemisphere), not true per-pixel normal perturbation — WebGL1 core has no derivatives without the OES_standard_derivatives extension. Both gaps and the reasoning are documented in the file's own header comment. All interaction (orbit/zoom/markers/tooltip/auto-rotate) and the lighting/atmosphere shader are fully real, not stubbed — only visual texture fidelity is capped below 'photographic'.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/3d-globe)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/effects-3d/globe3D.ts [globe3D]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
