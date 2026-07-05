---
title: "@domphy/blocks — borderBeam"
description: "Implemented as a pure declarative CSS/SVG technique instead of CSS offset-path (offset-path's coord-box keywords like 'border-box' trace the REFERENCING..."
---

# borderBeam

<script setup lang="ts">
import BorderBeamDemo from "../demos/blocks/borderBeam.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `borderBeam()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BorderBeamDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `size` | `number` | Length of the glowing comet, as a percentage (0-100) of the border perimeter. Defaults to `20`. |
| `thickness` | `number` | Stroke width in pixels the beam renders at. Defaults to `2`. |
| `borderRadius` | `number` | Corner radius in pixels, should roughly match the host card's own rounding. Defaults to `16`. |
| `colorFrom` | `ThemeColor` | Gradient start color. Defaults to `"warning"` (warm). |
| `colorTo` | `ThemeColor` | Gradient end color. Defaults to `"primary"` (cool). |
| `duration` | `number` | Full loop duration in seconds. Defaults to `6`. |
| `delay` | `number` | Delay before the loop starts, in seconds — use to stagger multiple beams. Defaults to `0`. |
| `reverse` | `boolean` | Runs the comet counter-clockwise instead of clockwise. |
| `children` | `DomphyElement[]` | Card content rendered inside the beamed container. Defaults to a small demo card body. |

::: details Implementation notes
Implemented as a pure declarative CSS/SVG technique instead of CSS offset-path (offset-path's coord-box keywords like 'border-box' trace the REFERENCING element's own box, not an ancestor's, so it cannot target the host container without JS measurement): an absolutely-positioned SVG &lt;rect&gt; with rx/ry matching the card radius, stroked with a 2-color gradient and a normalized pathLength=100 stroke-dasharray 'comet', whose stroke-dashoffset is animated 0-&gt;-100 (or +100 for reverse) via a linear-infinite @keyframes animation — a native CSS loop with zero JS/rAF/measurement, so it works identically in SSR/jsdom (structure renders; only the CSS animation itself doesn't execute outside a real browser). `size` is expressed as a percentage of the perimeter (0-100) rather than a literal pixel length, since pathLength normalization avoids needing to know the container's real perimeter in pixels — a deliberate scope trade documented in the prop doc comment. A second, wider, blurred duplicate rect is layered underneath for a soft halo. Doctor-clean (stops carry _doctorDisable:'missing-color' for the same paint-server reason as animatedBeam).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/border-beam)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/borderBeam.ts [borderBeam]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
