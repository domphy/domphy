---
title: "@domphy/blocks — chartRadarGridNone"
description: "Grid entirely omitted (gridShape: 'none' short-circuits all grid/spoke rendering in the shared renderRadarChart helper), not merely hidden via opacity -..."
---

# chartRadarGridNone

<script setup lang="ts">
import ChartRadarGridNoneDemo from "../demos/blocks/chartRadarGridNone.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarGridNone()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarGridNoneDemo" />

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
| `showGrid` | `boolean` | — |

::: details Implementation notes
Grid entirely omitted (gridShape: "none" short-circuits all grid/spoke rendering in the shared renderRadarChart helper), not merely hidden via opacity - matching the spec's 'grid presence toggle (grid omitted rather than merely hidden)' prop note.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-grid-none.ts [chartRadarGridNone]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
