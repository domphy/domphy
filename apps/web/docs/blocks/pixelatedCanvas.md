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

## Props

| Prop | Type | Description |
|---|---|---|
| `imageSource` | `string` | Source image URL. Defaults to a generic inline placeholder graphic (no network fetch). |
| `width` | `number` | Canvas CSS width, in px, at the base (non-responsive) size. Defaults to `480`. |
| `height` | `number` | Canvas CSS height, in px, at the base (non-responsive) size. Defaults to `320`. |
| `cellSize` | `number` | Grid cell size, in canvas px. Defaults to `5`. |
| `dotShape` | `PixelDotShape` | Dot shape drawn per cell. Defaults to `"square"`. |
| `dotScale` | `number` | Fraction (0-1) of each cell's size the dot actually fills. Defaults to `0.9`. |
| `backgroundColor` | `ThemeColor` | Canvas backdrop color family (shows through gaps between dots). Defaults to `"neutral"`. |
| `grayscale` | `boolean` | Desaturates every sampled dot to grayscale. Defaults to `false`. |
| `tintColor` | `ThemeColor` | Recolors every dot toward this theme color family (multiplies over the sampled luminance) instead of its original hue. |
| `distortionMode` | `PixelDistortionMode` | How cells near the cursor move. Defaults to `"repel"`. |
| `distortionStrength` | `number` | Maximum per-cell displacement, in px, at the cursor's center. Defaults to `14`. |
| `distortionRadius` | `number` | Radius, in px, within which cells are displaced. Defaults to `90`. |
| `pointerSmoothing` | `number` | Lerp factor (0-1, higher = snappier) easing the tracked pointer toward the raw pointer each frame. Defaults to `0.18`. |
| `jitter` | `number` | Per-frame random jitter amount, in px, added on top of the distortion offset. Defaults to `0`. |
| `frameRateCap` | `number` | Target frames per second cap for the redraw loop. Defaults to `60`. |
| `objectFit` | `PixelObjectFit` | How the source image is cropped/fit into the cell grid. Defaults to `"cover"`. |
| `responsive` | `boolean` | Scales the canvas to fill its container's measured width (aspect ratio locked to `width`/`height`) instead of a fixed pixel size. Defaults to `true`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Full implementation: hidden sampling canvas resampled on image load/resize, visible canvas redraws every cell each frame with repel/attract/swirl distortion (distance falloff), per-cell offset easing back to rest on pointer-leave, optional jitter, pointer-position lerp smoothing, fps cap, grayscale/tint, square/circle dots, and responsive (ResizeObserver-driven) sizing — all gated by IntersectionObserver. No functional gaps; the animation loop itself can't be exercised in jsdom (no real 2D canvas backend), so its test only verifies structure, matching how every other canvas-driven component in this package is tested.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/pixelated-canvas)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/pixelatedCanvas.ts [pixelatedCanvas]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
