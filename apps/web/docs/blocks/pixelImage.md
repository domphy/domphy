---
title: "@domphy/blocks — pixelImage"
description: "Exactly the spec's structural technique: N full <img> copies of the same src stacked via position:absolute, each clip-path:polygon()-clipped to its own..."
---

# pixelImage

<script setup lang="ts">
import PixelImageDemo from "../demos/blocks/pixelImage.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `pixelImage()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="PixelImageDemo" />

::: details Implementation notes
Exactly the spec's structural technique: N full &lt;img&gt; copies of the same src stacked via position:absolute, each clip-path:polygon()-clipped to its own row/column cell (computed once), not real pixelation. Per-tile transition-delay is randomized once in JS at construction; a single shared reactive 'revealed' boolean flips shortly after mount (via setTimeout(0), matching blurFade.ts's own 'reveal shortly after mount' idiom) so each tile's CSS opacity transition fires at its own staggered moment with no JS animation loop. Optional grayscale-to-color sweep uses a second boolean flipped after colorSweepDelay, animating a filter:grayscale() transition. Four named grid presets (default 6x4, fine 8x8, tallStrip 8x3, wideStrip 3x8) plus an explicit rows/cols override. Default demo image is a generic inline SVG data URI (no network fetch, no real photo), matching avatarCircles.ts's own placeholder convention in this package. Container carries role=img + aria-label; each duplicated tile &lt;img&gt; is alt="" + aria-hidden (composite-image accessibility pattern).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/pixel-image)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/pixelImage.ts [pixelImage]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
