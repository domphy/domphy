---
title: "@domphy/blocks — chartAreaIcons"
description: "Same stacked two-series chart as chartAreaLegend, but each legend entry uses a hand-authored trend-arrow SVG pictogram instead of a flat swatch, and the footer..."
---

# chartAreaIcons

<script setup lang="ts">
import ChartAreaIconsDemo from "../demos/blocks/chartAreaIcons.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaIcons()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaIconsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartAreaTwoSeriesPoint[]` | — |
| `series` | `ChartAreaIconsSeries[]` | — |
| `stackId` | `string` | — |
| `fillOpacity` | `number` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
Same stacked two-series chart as chartAreaLegend, but each legend entry uses a hand-authored trend-arrow SVG pictogram instead of a flat swatch, and the footer pairs its sentence with an icon (shared chartTrendFooter behavior). Icon choice is fully caller-configurable per the spec's research note (default demo pairs 'down' with one series and 'up' with the other purely to demonstrate the capability). VISUAL QA FIX (2026-07-04): shared the same solid-flat-rectangle @domphy/chart engine bug as chartAreaStacked (LineRenderer area-fill baseline + y-axis auto-extent not accounting for stacked cumulative sums) — fixed at the engine layer, see chartAreaStacked's notes for detail. Same mount-reveal approximation caveat as chartAreaDefault. Direct-source-diff fix (2026-07-05): Horizontal gridlines were missing (already correctly stacked with an icon legend). Fixed.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-icons.ts [chartAreaIcons]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
