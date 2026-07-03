---
title: "@domphy/blocks — parallaxScroll"
description: "Images are round-robin split into a fixed set of DOM columns (default 3, clamped 1-6), each with alternating up/down translateY driven by the section's own..."
---

# parallaxScroll

<script setup lang="ts">
import ParallaxScrollDemo from "../demos/blocks/parallaxScroll.ts?raw"
</script>

A **Scroll** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `parallaxScroll()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ParallaxScrollDemo" />

::: details Implementation notes
Images are round-robin split into a fixed set of DOM columns (default 3, clamped 1-6), each with alternating up/down translateY driven by the section's own enter/exit scroll fraction, rAF-lerped for a trailing/spring-like feel. Column count reads as responsive via CSS media steps (1 col mobile / 2 tablet / repeat(N) desktop) on the same 3 DOM columns rather than re-bucketing images on resize -- matches the reference's own 'pre-split into literal arrays' approach. Uses direct DOM style writes (not reactive State) for the per-frame transform since there can be dozens of images. onImageClick is supported. No real spring-physics library is used (no dependency added) -- smoothing is a simple exponential rAF lerp, a reasonable approximation of 'spring/damping' per the spec's own wording.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/parallax-scroll)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/scroll/parallaxScroll.ts [parallaxScroll]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
