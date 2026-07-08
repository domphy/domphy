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
| `size` | `number` | Diameter of the traveling comet in pixels; also the corner radius of its orbit path. Defaults to `50` (upstream `size`). |
| `thickness` | `number` | Width in pixels of the border ring the comet is masked into. Defaults to `1` (upstream `borderWidth`). |
| `borderRadius` | `number` | Corner radius in pixels, should roughly match the host card's own rounding. Defaults to `16`. |
| `colorFrom` | `ThemeColor` | Comet head color (bright end of the fade). Defaults to `"warning"` (warm, upstream #ffaa40). |
| `colorTo` | `ThemeColor` | Comet mid color (fades on to a transparent tail). Defaults to `"secondary"` (violet, upstream #9c40ff). |
| `duration` | `number` | Full loop duration in seconds. Defaults to `6`. |
| `delay` | `number` | Negative phase offset in seconds applied immediately (staggers multiple beams that all run at once) — NOT a start delay. Defaults to `0`. |
| `reverse` | `boolean` | Runs the comet counter-clockwise instead of clockwise. |
| `initialOffset` | `number` | Starting position along the orbit as a percentage (0-100) — another way to stagger multiple beams. Defaults to `0`. |
| `children` | `DomphyElement[]` | Card content rendered inside the beamed container. Defaults to a small demo card body. |

::: details Implementation notes
Implemented as a pure declarative CSS/SVG technique instead of CSS offset-path (offset-path's coord-box keywords like 'border-box' trace the REFERENCING element's own box, not an ancestor's, so it cannot target the host container without JS measurement): an absolutely-positioned SVG &lt;rect&gt; with rx/ry matching the card radius, stroked with a 2-color gradient and a normalized pathLength=100 stroke-dasharray 'comet', whose stroke-dashoffset is animated 0-&gt;-100 (or +100 for reverse) via a linear-infinite @keyframes animation — a native CSS loop with zero JS/rAF/measurement, so it works identically in SSR/jsdom (structure renders; only the CSS animation itself doesn't execute outside a real browser). `size` is expressed as a percentage of the perimeter (0-100) rather than a literal pixel length, since pathLength normalization avoids needing to know the container's real perimeter in pixels — a deliberate scope trade documented in the prop doc comment. A second, wider, blurred duplicate rect is layered underneath for a soft halo. Doctor-clean (stops carry _doctorDisable:'missing-color' for the same paint-server reason as animatedBeam).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/border-beam)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/borderBeam.ts [borderBeam]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
