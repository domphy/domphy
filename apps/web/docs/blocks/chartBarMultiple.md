---
title: "@domphy/blocks — chartBarMultiple"
description: "Two-series grouped bar chart (desktop/mobile) sharing the category axis; vertical split lines only (yAxis split lines off), the engine's default axis-trigger..."
---

# chartBarMultiple

<script setup lang="ts">
import ChartBarMultipleDemo from "../demos/blocks/chartBarMultiple.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarMultiple()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarMultipleDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartBarTwoSeriesPoint[]` | — |
| `series` | `ChartBarMultipleSeries[]` | — |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
Two-series grouped bar chart (desktop/mobile) sharing the category axis; vertical split lines only (yAxis split lines off), the engine's default axis-trigger tooltip formatter already renders one color-dot+label+value row per series (matching the spec's swatch-tooltip with no per-month title line), and the default axisPointer type ('line') gives the vertical cursor guide line for free. `barGap`/`barCategoryGap` were intentionally NOT exposed as props — BarRenderer declares but never reads those fields (bar/group spacing is a fixed internal ratio), so there is nothing for them to control; documented in chart-bar-shared.ts's file-level note. Corner radius request (4px) is likewise capped at the engine's hardcoded 2px.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-multiple.ts [chartBarMultiple]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
