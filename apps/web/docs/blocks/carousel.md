---
title: "@domphy/blocks — carousel"
description: "Rounded photo-card slides with gradient+headline+pill CTA overlay, round prev/next controls, click-to-navigate on partially-visible neighbors, and a pure-CSS..."
---

# carousel

<script setup lang="ts">
import CarouselDemo from "../demos/blocks/carousel.ts?raw"
</script>

A **Overlays** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `carousel()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CarouselDemo" />

::: details Implementation notes
Rounded photo-card slides with gradient+headline+pill CTA overlay, round prev/next controls, click-to-navigate on partially-visible neighbors, and a pure-CSS `&:hover [data-attr]` icon nudge on the CTA. Neighbor de-emphasis (scale 0.86, opacity 0.55/0) uses invented-but-qualitatively-matching numbers, exactly as the spec's research note pre-authorized ('exact numbers weren't exposed... aim for the qualitative effect').

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/carousel)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/overlays/carousel.ts [carousel]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
