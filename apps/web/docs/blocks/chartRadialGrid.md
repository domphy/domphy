---
title: "@domphy/blocks — chartRadialGrid"
description: "Same five-ring base (renderRadialRingsChart) as chartRadialSimple with showBackgroundTrack:false and showGridCircles:true — solid per-ring tracks are replaced..."
---

# chartRadialGrid

<script setup lang="ts">
import ChartRadialGridDemo from "../demos/blocks/chartRadialGrid.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadialGrid()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadialGridDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `RadialSeriesDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `gridCircleCount` | `number` | — |
| `outerRadius` | `number` | — |

::: details Implementation notes
Same five-ring base (renderRadialRingsChart) as chartRadialSimple with showBackgroundTrack:false and showGridCircles:true — solid per-ring tracks are replaced with a small set of thin, evenly-spaced concentric &lt;circle&gt; gridlines (default 4, configurable) drawn once behind all rings, and outerRadius defaults slightly smaller (82 vs 90) to leave margin for the grid, per spec. Same hover tooltip and grow-in sweep as chartRadialSimple. tsc --noEmit clean; 2/2 tests pass.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radial)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radial-grid.ts [chartRadialGrid]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
