---
title: "@domphy/blocks — chartBarActive"
description: "A designated bar (activeIndex, default 2) is emphasized by a dashed-stroke rounded-rect SVG overlay (chartBarActiveOverlay) drawn with the same public scale..."
---

# chartBarActive

<script setup lang="ts">
import ChartBarActiveDemo from "../demos/blocks/chartBarActive.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarActive()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarActiveDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartBarCategoryPoint[]` | — |
| `seriesLabel` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `activeIndex` | `number` | Index of the bar rendered with the dashed-outline "active" treatment. |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
A designated bar (activeIndex, default 2) is emphasized by a dashed-stroke rounded-rect SVG overlay (chartBarActiveOverlay) drawn with the same public scale factories as the real chart, positioned pixel-exact over that bar. The standard hover-tooltip cursor rectangle is disabled via axisPointer:'none' as specified. Two real gaps versus the spec, both from BarRenderer (packages/chart/src/gl/BarRenderer.ts) reading only itemStyle.color per data item and nothing else: (1) the spec's '~0.8 fill opacity on the active bar, other bars comparatively flat/muted' cannot be reproduced — there is no per-item opacity hook, so all bars render at full, equal opacity and only the dashed outline distinguishes the active one. (2) the dashed stroke is a separate overlay rect, not a stroke drawn on the bar's own WebGL geometry (no borderWidth/borderType/borderColor support), so it can visually drift by a pixel or two on rapid container resizes between the chart's own render pass and the overlay's ResizeObserver-driven redraw. Click/hover-to-reassign which bar is active (mentioned in the spec as an optional 'could reassign' extension, not the reference demo's actual fixed-default behavior) was not wired up — `activeIndex` is a static prop evaluated once per render, matching the literal 'fixed bar marked active by default' behavior the spec describes as required.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-active.ts [chartBarActive]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
