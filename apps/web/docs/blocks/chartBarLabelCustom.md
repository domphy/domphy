---
title: "@domphy/blocks — chartBarLabelCustom"
description: "Horizontal single-series chart (desktop values from the two-series monthly dataset) with both axes fully hidden."
---

# chartBarLabelCustom

<script setup lang="ts">
import ChartBarLabelCustomDemo from "../demos/blocks/chartBarLabelCustom.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarLabelCustom()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarLabelCustomDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartBarTwoSeriesPoint[]` | — |
| `seriesLabel` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `grid` | `ChartBarGrid` | — |
| `height` | `number` | — |

::: details Implementation notes
Horizontal single-series chart (desktop values from the two-series monthly dataset) with both axes fully hidden. Inside (category name, light on-fill color) and outside (value, foreground color) labels are drawn by a dedicated SVG overlay (chartBarInsideOutsideLabelOverlay) that replicates BarRenderer's own single-series horizontal bar-rect formula (bandwidth*0.65 thickness, band-centered) using the engine's exported scale factories — necessary because overlay/labels.ts's renderBarLabels only positions labels correctly for vertical bars (it always computes label position from `xScale.bandwidth()`, which is 0 for a value-type x-axis), so the built-in `label` option cannot be used for this orientation. A companion hover overlay still provides full-detail tooltips on demand.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-label-custom.ts [chartBarLabelCustom]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
