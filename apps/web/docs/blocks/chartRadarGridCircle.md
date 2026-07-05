---
title: "@domphy/blocks — chartRadarGridCircle"
description: "Circular ring grid with radial spokes kept (the one differentiator from chartRadarGrid, per spec) and corner dots on by default.."
---

# chartRadarGridCircle

<script setup lang="ts">
import ChartRadarGridCircleDemo from "../demos/blocks/chartRadarGridCircle.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarGridCircle()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarGridCircleDemo" />

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
| `showDots` | `boolean` | — |

::: details Implementation notes
Circular ring grid with radial spokes kept (the one differentiator from chartRadarGrid, per spec) and corner dots on by default.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-grid-circle.ts [chartRadarGridCircle]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
