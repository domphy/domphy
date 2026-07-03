---
title: "@domphy/blocks — pixelatedCanvas"
description: "Full implementation: hidden sampling canvas resampled on image load/resize, visible canvas redraws every cell each frame with repel/attract/swirl distortion..."
---

# pixelatedCanvas

<script setup lang="ts">
import PixelatedCanvasDemo from "../demos/blocks/pixelatedCanvas.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `pixelatedCanvas()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="PixelatedCanvasDemo" />

::: details Implementation notes
Full implementation: hidden sampling canvas resampled on image load/resize, visible canvas redraws every cell each frame with repel/attract/swirl distortion (distance falloff), per-cell offset easing back to rest on pointer-leave, optional jitter, pointer-position lerp smoothing, fps cap, grayscale/tint, square/circle dots, and responsive (ResizeObserver-driven) sizing — all gated by IntersectionObserver. No functional gaps; the animation loop itself can't be exercised in jsdom (no real 2D canvas backend), so its test only verifies structure, matching how every other canvas-driven component in this package is tested.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/pixelated-canvas)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/pixelatedCanvas.ts [pixelatedCanvas]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
