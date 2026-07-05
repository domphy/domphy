---
title: "@domphy/blocks — ditherShader"
description: "All 4 dither modes (bayer/halftone/noise/crosshatch) x 4 color modes (grayscale/original/duotone/custom) implemented, plus animated phase-drift via rAF gated..."
---

# ditherShader

<script setup lang="ts">
import DitherShaderDemo from "../demos/blocks/ditherShader.ts?raw"
</script>

A **Overlays** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `ditherShader()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DitherShaderDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `src` | `string` | Source image URL. Defaults to a generic inline placeholder graphic (no network fetch). |
| `alt` | `string` | Accessible label for the rendered image. Defaults to `"Dithered image"`. |
| `gridSize` | `number` | Dither cell/block size, in output px. Defaults to `4`. |
| `ditherMode` | `DitherPatternMode` | Ordered-dither pattern rule. Defaults to `"bayer"`. |
| `colorMode` | `DitherColorMode` | How on/off cells are colored. Defaults to `"grayscale"`. |
| `primaryColor` | `ThemeColor` | "Ink" color family for `"duotone"`/`"custom"` color modes. Defaults to `"neutral"`. |
| `secondaryColor` | `ThemeColor` | "Paper" color family for `"duotone"`/`"custom"` color modes. Defaults to `"neutral"`. |
| `threshold` | `number` | Luminance threshold (0-1) separating "on" from "off" cells. Defaults to `0.5`. |
| `brightness` | `number` | Additive brightness adjustment, roughly -1 to 1. Defaults to `0`. |
| `contrast` | `number` | Contrast adjustment, roughly -1 to 1. Defaults to `0`. |
| `animated` | `boolean` | Subtly drifts the dither pattern every frame instead of rendering once. Defaults to `false`. |
| `animationSpeed` | `number` | Phase units advanced per second while `animated`. Defaults to `1`. |
| `width` | `number` | Output CSS width, in px. Defaults to `480`. |
| `height` | `number` | Output CSS height, in px. Defaults to `320`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
All 4 dither modes (bayer/halftone/noise/crosshatch) x 4 color modes (grayscale/original/duotone/custom) implemented, plus animated phase-drift via rAF gated by IntersectionObserver, plus brightness/contrast/threshold controls. Uses a standard 4x4 Bayer matrix per the spec's own 'medium confidence' allowance. colorMode='custom' resolves through theme color families (like duotone) rather than arbitrary hex, since Domphy's doctor forbids raw color literals in style — this is a deliberate, documented scope narrowing from a literally-free-RGB 'custom' mode, not a missing capability.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/dither-shader)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/overlays/ditherShader.ts [ditherShader]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
