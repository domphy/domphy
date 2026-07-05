---
title: "@domphy/blocks — scrollProgress"
description: "Single fixed-position div whose transform: scaleX(fraction) (transform-origin at the left edge) tracks scroll position."
---

# scrollProgress

<script setup lang="ts">
import ScrollProgressDemo from "../demos/blocks/scrollProgress.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `scrollProgress()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ScrollProgressDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `thickness` | `number` | Bar thickness, in `themeSpacing` units. Defaults to `1`. |
| `color` | `ThemeColor` | Theme color family for the fill gradient. Defaults to `"primary"`. |
| `smoothing` | `number` | Lerp factor per animation frame (0–1); higher catches up faster. Defaults to `0.2`. |
| `zIndex` | `number` | Stacking order. Defaults to `50`. |
| `target` | `() =&gt; Element \| null` | Getter for a specific scrollable container to track instead of the whole page/window. Called on mount and on every scroll/resize. |
| `style` | `StyleObject` | Passthrough style merged onto the bar. |

::: details Implementation notes
Single fixed-position div whose transform: scaleX(fraction) (transform-origin at the left edge) tracks scroll position. Event-driven rather than polling every frame: a passive scroll/resize listener updates a target fraction, and a requestAnimationFrame loop only runs while lerping the visible value toward that target (smoothing factor configurable), stopping once converged — reads as fluid without a perpetual per-frame cost. Supports an optional `target` getter for tracking a specific scrollable container instead of the whole page, as the spec's own researchNote suggested as a natural extension. Listeners/rAF are torn down on removal.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/scroll-progress)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/scrollProgress.ts [scrollProgress]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
