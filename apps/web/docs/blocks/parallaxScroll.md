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

## Props

| Prop | Type | Description |
|---|---|---|
| `images` | `(string \| ParallaxScrollImage)[]` | Photos to distribute round-robin across the columns. Defaults to 15 generated placeholders. |
| `columns` | `number` | Number of DOM columns. Clamped to 1–6. Defaults to `3` (CSS steps it down to 2 on tablet and 1 on mobile regardless of this value). |
| `gap` | `number` | Gap between images (within a column) and between columns, in `themeSpacing` units. Defaults to `4`. |
| `aspectRatio` | `string` | CSS `aspect-ratio` every image is cropped to via `object-fit: cover`. Defaults to `"3 / 4"`. |
| `intensity` | `number` | Maximum `translateY` distance any column travels, in px, at full scroll progress. Defaults to `200`. |
| `smoothing` | `number` | rAF lerp factor (0–1) smoothing the raw scroll target; higher catches up faster. Defaults to `0.15`. |
| `onImageClick` | `(image: ParallaxScrollImage, index: number) =&gt; void` | Called when an image is clicked/tapped, with the image and its flat index in `images`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer section. |

::: details Implementation notes
Images are round-robin split into a fixed set of DOM columns (default 3, clamped 1-6), each with alternating up/down translateY driven by the section's own enter/exit scroll fraction, rAF-lerped for a trailing/spring-like feel. Column count reads as responsive via CSS media steps (1 col mobile / 2 tablet / repeat(N) desktop) on the same 3 DOM columns rather than re-bucketing images on resize -- matches the reference's own 'pre-split into literal arrays' approach. Uses direct DOM style writes (not reactive State) for the per-frame transform since there can be dozens of images. onImageClick is supported. No real spring-physics library is used (no dependency added) -- smoothing is a simple exponential rAF lerp, a reasonable approximation of 'spring/damping' per the spec's own wording.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/parallax-scroll)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/scroll/parallaxScroll.ts [parallaxScroll]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
