---
title: "@domphy/blocks — chartRadarRadius"
description: "Radius-axis rendered as a single line segment from the chart center out to the plot radius at a fixed 60deg angle (not a full symmetric diameter), matching the..."
---

# chartRadarRadius

<script setup lang="ts">
import ChartRadarRadiusDemo from "../demos/blocks/chartRadarRadius.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarRadius()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarRadiusDemo" />

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
| `radiusAxisAngle` | `number` | — |
| `showRadiusAxisLine` | `boolean` | — |

::: details Implementation notes
Radius-axis rendered as a single line segment from the chart center out to the plot radius at a fixed 60deg angle (not a full symmetric diameter), matching the spec's 'subtle line through roughly one spoke direction... not a fully symmetric cross'. Tooltip now shows the category heading above both series' line-indicator rows. Direct-source-diff fix (2026-07-05): Perimeter month-name labels were always drawn — upstream's radius variant omits the angle axis entirely (no perimeter labels). Added a showAngleLabels option (default true, only this recipe sets it false).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-radius.ts [chartRadarRadius]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
