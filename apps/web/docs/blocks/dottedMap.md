---
title: "@domphy/blocks — dottedMap"
description: "Fully implements the described architecture: a pre-computed (non-animated) equirectangular grid of SVG dots forming a stippled world silhouette, plus a marker..."
---

# dottedMap

<script setup lang="ts">
import DottedMapDemo from "../demos/blocks/dottedMap.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `dottedMap()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DottedMapDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `width` | `number` | SVG viewBox width (user units). Defaults to `150`. |
| `height` | `number` | SVG viewBox height (user units). Defaults to `75`. |
| `columns` | `number` | Grid columns sampled across the map width (rows derive from the 2:1 aspect ratio) — more columns = denser dot grid. Defaults to `80`. |
| `markers` | `DottedMapMarker[]` | — |
| `dotRadius` | `number` | Background land-dot radius (SVG units). Defaults to `0.3`. |
| `markerRadius` | `number` | Marker dot radius (SVG units). Defaults to `1.6`. |
| `dotColor` | `ThemeColor` | Background dot color — dots render with `fill: currentColor`, so this sets the map's `color`. Defaults to `"neutral"`. |
| `markerColor` | `ThemeColor` | Default marker color, overridable per marker. Defaults to `"primary"`. |
| `pulse` | `boolean` | Default pulse setting, overridable per marker. Defaults to `true`. |
| `staggerRows` | `boolean` | Offsets alternating rows horizontally by half a column width for a more organic dot layout. Defaults to `true`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Fully implements the described architecture: a pre-computed (non-animated) equirectangular grid of SVG dots forming a stippled world silhouette, plus a marker layer supporting per-marker color/pulse overrides, a repeating CSS @keyframes radar-ping ring, and a custom overlay renderer (via SVG &lt;foreignObject&gt; + CSS clip-path circle) for e.g. avatar images — all exactly as specified, with zero stubs. The one deliberate fidelity gap, called out because it affects the VISUAL result: land/water classification uses a small, hand-authored set of ellipse approximations per continent (with a per-point pseudo-random jitter so edges look stippled rather than geometrically smooth) instead of a real geographic point-set or polygon containment test — this is the exact substitution the spec's own researchNote sanctions ('a clean-room build can substitute any lightweight equirectangular projection plus a pre-baked landmass point set... to avoid heavy geo-boundary dependencies'), but it means continent silhouettes are stylized/decorative rather than coastline-accurate. Default grid density (80 columns / 40 rows ≈ 3200 samples) is intentionally lower than the spec's illustrative ~5000-sample default, traded off for render/test performance — both counts are explicitly framed by the spec as non-normative starting points, not requirements.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/dotted-map)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/dottedMap.ts [dottedMap]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
