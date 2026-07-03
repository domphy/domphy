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

::: details Implementation notes
All 4 dither modes (bayer/halftone/noise/crosshatch) x 4 color modes (grayscale/original/duotone/custom) implemented, plus animated phase-drift via rAF gated by IntersectionObserver, plus brightness/contrast/threshold controls. Uses a standard 4x4 Bayer matrix per the spec's own 'medium confidence' allowance. colorMode='custom' resolves through theme color families (like duotone) rather than arbitrary hex, since Domphy's doctor forbids raw color literals in style — this is a deliberate, documented scope narrowing from a literally-free-RGB 'custom' mode, not a missing capability.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/dither-shader)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/overlays/ditherShader.ts [ditherShader]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
