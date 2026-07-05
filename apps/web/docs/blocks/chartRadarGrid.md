---
title: "@domphy/blocks — chartRadarGrid"
description: "Circular ring grid with radial spokes suppressed and vertex dots on, matching the spec's own note that upstream calls this variant 'Grid Circle - No lines' but..."
---

# chartRadarGrid

<script setup lang="ts">
import ChartRadarGridDemo from "../demos/blocks/chartRadarGrid.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarGrid()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarGridDemo" />

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
| `gridShape` | `"polygon" \| "circle"` | — |
| `showSpokes` | `boolean` | — |
| `showDots` | `boolean` | — |

::: details Implementation notes
Circular ring grid with radial spokes suppressed and vertex dots on, matching the spec's own note that upstream calls this variant 'Grid Circle - No lines' but it's grouped here under the plain 'grid' export name as the base member of the grid family. Tooltip is value-only (no category heading, no swatch) per spec.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-grid.ts [chartRadarGrid]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
