---
title: "@domphy/blocks — chartRadarGridCustom"
description: "Single polygon ring at a configurable fraction of the plot radius (default 0.75, chosen for a 'roughly mid-to-outer' look in this port's own 200-unit viewBox -..."
---

# chartRadarGridCustom

<script setup lang="ts">
import ChartRadarGridCustomDemo from "../demos/blocks/chartRadarGridCustom.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarGridCustom()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarGridCustomDemo" />

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
| `ringFraction` | `number` | — |
| `showSpokes` | `boolean` | — |

::: details Implementation notes
Single polygon ring at a configurable fraction of the plot radius (default 0.75, chosen for a 'roughly mid-to-outer' look in this port's own 200-unit viewBox - the spec's upstream absolute ~90px figure doesn't map 1:1 onto a differently-sized coordinate space, so an own-judgment proportional value was used instead), no radial spokes.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-grid-custom.ts [chartRadarGridCustom]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
