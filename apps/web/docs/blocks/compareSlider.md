---
title: "@domphy/blocks — compareSlider"
description: "Reveals the overlay image via a reactive `clip-path: inset(...)` on the image itself (sized 100%/100% like the base image) rather than shrinking a narrower..."
---

# compareSlider

<script setup lang="ts">
import CompareSliderDemo from "../demos/blocks/compareSlider.ts?raw"
</script>

A **Layout** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `compareSlider()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CompareSliderDemo" />

::: details Implementation notes
Reveals the overlay image via a reactive `clip-path: inset(...)` on the image itself (sized 100%/100% like the base image) rather than shrinking a narrower wrapper div around a full-width image — same visual result the spec describes, but sidesteps the 'wrapper width must track image's true rendered width' pitfall the spec's own researchNote flags, since the image's own box never resizes. Hover mode tracks pointermove on the container directly (no press); drag mode uses pointerdown + window-level pointermove/pointerup for the press duration (same idiom as this package's draggableCard.ts/splitterHandle()). Autoplay is a requestAnimationFrame sine oscillation between 10%-90% that pauses (without losing phase) during any interaction. Placeholder gradient panels render when firstImage/secondImage are omitted, matching this package's draggableCard.ts placeholder idiom. No image preload/loading-state handling beyond a native &lt;img&gt;.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/compare)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/layout/compareSlider.ts [compareSlider]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
