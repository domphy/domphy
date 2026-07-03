---
title: "@domphy/blocks — parallaxHeroImages"
description: "Pointer-driven, rAF-lerped per-image transforms (direct DOM style writes, smoothed rather than snapping, resetting to neutral on pointerleave), with 'default'..."
---

# parallaxHeroImages

<script setup lang="ts">
import ParallaxHeroImagesDemo from "../demos/blocks/parallaxHeroImages.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `parallaxHeroImages()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ParallaxHeroImagesDemo" />

::: details Implementation notes
Pointer-driven, rAF-lerped per-image transforms (direct DOM style writes, smoothed rather than snapping, resetting to neutral on pointerleave), with 'default' and 'edge-focus' depth-mapping variants across two rows of up to 8 images. The spec's own researchNote says exact per-image depth-factor tiers aren't exposed publicly; implemented two straightforward tiers (close=1x, far=0.35x) mapped to 'edge' vs 'middle' screen position per row, flipped by variant, which is a reasonable documented choice rather than a verified exact match. `className`/`imageClassName` map to Domphy's `style`/`imageStyle` passthroughs.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/parallax-hero-images)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/parallaxHeroImages.ts [parallaxHeroImages]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
