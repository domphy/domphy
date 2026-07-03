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

::: details Implementation notes
Canvas 2D 'particle grid' loop matching the spec exactly: a flat Float32Array holds one opacity per cell, each rAF tick rerolls a subset via `Math.random() &lt; flickerChance * deltaSeconds`, only hit cells change. Gated by IntersectionObserver (loop stops off-screen) and ResizeObserver (recomputes columns/rows + reallocates the opacity array on resize), with devicePixelRatio-scaled backing store via `context.setTransform` (not `.scale`, to avoid compounding on repeated resizes -- a latent issue present in this package's existing particles.ts that this file avoids). Fill color is resolved once via themeColorToken() into a concrete hex string at mount time (canvas 2D has no var() concept) and does not live-update on a later runtime theme swap -- same documented limitation as particles.ts elsewhere in this package. Demo defaults were adapted to Domphy's dark shift-15 demo-panel convention (used consistently by particles/meteors in this package) rather than literally reproducing the spec's 'near-black on white' default; the `color` prop is a Domphy ThemeColor family, not a literal color string.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/flickering-grid)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/flickeringGrid.ts [flickeringGrid]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
