---
title: "@domphy/blocks — chartRadarMultiple"
description: "Same SVG/tooltip engineering approach as chartRadarDefault."
---

# chartRadarMultiple

<script setup lang="ts">
import ChartRadarMultipleDemo from "../demos/blocks/chartRadarMultiple.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarMultiple()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarMultipleDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `RadarPoint[]` | — |
| `series` | `RadarSeriesConfig[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `tooltipIndicator` | `RadarTooltipIndicator` | — |

::: details Implementation notes
Same SVG/tooltip engineering approach as chartRadarDefault. Tooltip renders both series' values with a thin line-style indicator and no month heading (interpreted from the spec's own contrast against chartRadarRadius, which explicitly says it 'now' adds the heading 'rather than only showing values').

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-multiple.ts [chartRadarMultiple]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
