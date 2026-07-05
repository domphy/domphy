---
title: "@domphy/blocks — heroParallax"
description: "products are chunked sequentially into `rows` (default 3) rows of thumbnail cards; a single pinned-range scroll progress (rAF-lerped State<number>) drives the..."
---

# heroParallax

<script setup lang="ts">
import HeroParallaxDemo from "../demos/blocks/heroParallax.ts?raw"
</script>

A **Scroll** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `heroParallax()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="HeroParallaxDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `products` | `HeroParallaxProduct[]` | Product thumbnails distributed across rows. Defaults to 15 generated placeholders. |
| `heading` | `string` | Large centered headline. Defaults to a short demo line. |
| `subtext` | `string` | Supporting subtext beneath the headline. Defaults to a short demo line. |
| `rows` | `number` | Number of rows the products are chunked into, in order. Defaults to `3`. |
| `intensity` | `number` | Multiplier scaling the rotation/translate travel distance. Defaults to `1`. |
| `wrapperHeightVh` | `number` | How tall the scroll wrapper is, in viewport-height units. Defaults to `230`, clamped to a minimum of `150`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer section. |

::: details Implementation notes
products are chunked sequentially into `rows` (default 3) rows of thumbnail cards; a single pinned-range scroll progress (rAF-lerped State&lt;number&gt;) drives the whole grid's rotateX/opacity/translateY plus a per-row translateX that collapses from a wide spread down to a permanent small stagger baseline (alternating left/right per row), matching the spec's 'flattens + fades in + rows slide into place, staying mosaic-like at rest' description. Heading/product copy is original placeholder text (the upstream demo's specific studio copy was never viewed, per the clean-room constraint, and the spec itself flags it as placeholder).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/hero-parallax)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/scroll/heroParallax.ts [heroParallax]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
