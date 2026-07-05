---
title: "@domphy/blocks — chartAreaLegend"
description: "Stacked two-series chart (same treatment as chartAreaStacked) plus a hand-built centered swatch+label legend row below the plot, deliberately NOT using..."
---

# chartAreaLegend

<script setup lang="ts">
import ChartAreaLegendDemo from "../demos/blocks/chartAreaLegend.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaLegend()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaLegendDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartAreaTwoSeriesPoint[]` | — |
| `series` | `ChartAreaLegendSeries[]` | — |
| `stackId` | `string` | — |
| `fillOpacity` | `number` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
Stacked two-series chart (same treatment as chartAreaStacked) plus a hand-built centered swatch+label legend row below the plot, deliberately NOT using @domphy/chart's built-in LegendOption overlay (which only supports a fixed geometric SymbolType vocabulary and lives inside the chart's own SVG layer) so the legend can use @domphy/ui's small()/icon() patches and sit cleanly in the card's DOM flow. VISUAL QA FIX (2026-07-04): shared the same solid-flat-rectangle @domphy/chart engine bug as chartAreaStacked (LineRenderer area-fill baseline + y-axis auto-extent not accounting for stacked cumulative sums) — fixed at the engine layer, see chartAreaStacked's notes for detail. Same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-legend.ts [chartAreaLegend]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
