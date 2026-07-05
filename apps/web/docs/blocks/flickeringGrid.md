---
title: "@domphy/blocks — flickeringGrid"
description: "Canvas 2D 'particle grid' loop matching the spec exactly: a flat Float32Array holds one opacity per cell, each rAF tick rerolls a subset via `Math.random() <..."
---

# flickeringGrid

<script setup lang="ts">
import FlickeringGridDemo from "../demos/blocks/flickeringGrid.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `flickeringGrid()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="FlickeringGridDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `squareSize` | `number` | Side length of each square, in canvas px. Defaults to `4`. |
| `gridGap` | `number` | Gap between squares, in canvas px. Defaults to `6`. |
| `flickerChance` | `number` | Probability factor driving how often a cell rerolls its opacity (higher = more frequent flicker). Defaults to `0.3`. |
| `color` | `ThemeColor` | Theme color family for the squares. Defaults to `"neutral"`. |
| `width` | `number` | Fixed canvas width, in px. Omit to fill the parent container's measured width. |
| `height` | `number` | Fixed canvas height, in px. Omit to fill the parent container's measured height. |
| `maxOpacity` | `number` | Ceiling for each cell's randomized opacity. Defaults to `0.3`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the grid. Defaults to a small demo heading. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Canvas 2D 'particle grid' loop matching the spec exactly: a flat Float32Array holds one opacity per cell, each rAF tick rerolls a subset via `Math.random() &lt; flickerChance * deltaSeconds`, only hit cells change. Gated by IntersectionObserver (loop stops off-screen) and ResizeObserver (recomputes columns/rows + reallocates the opacity array on resize), with devicePixelRatio-scaled backing store via `context.setTransform` (not `.scale`, to avoid compounding on repeated resizes -- a latent issue present in this package's existing particles.ts that this file avoids). Fill color is resolved once via themeColorToken() into a concrete hex string at mount time (canvas 2D has no var() concept) and does not live-update on a later runtime theme swap -- same documented limitation as particles.ts elsewhere in this package. Demo defaults were adapted to Domphy's dark shift-15 demo-panel convention (used consistently by particles/meteors in this package) rather than literally reproducing the spec's 'near-black on white' default; the `color` prop is a Domphy ThemeColor family, not a literal color string.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/flickering-grid)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/flickeringGrid.ts [flickeringGrid]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
