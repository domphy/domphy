---
title: "@domphy/blocks — chartLineDotsColors"
description: "@domphy/chart's line-symbol renderer only ever draws one uniform (white-fill/series-stroke) circle per series and ignores any per-item color, so true per-point..."
---

# chartLineDotsColors

<script setup lang="ts">
import ChartLineDotsColorsDemo from "../demos/blocks/chartLineDotsColors.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineDotsColors()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineDotsColorsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `description` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `data` | `CategoryPoint[]` | — |
| `trendHeadline` | `string` | — |
| `trendSubtitle` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |

::: details Implementation notes
@domphy/chart's line-symbol renderer only ever draws one uniform (white-fill/series-stroke) circle per series and ignores any per-item color, so true per-point colored dots aren't reachable through ChartOption alone. Implemented via staticPointMarkersOverlay: native symbols disabled (showSymbol:false) and a companion SVG layer draws one circle per category, each colored from the data row, positioned with the same public scale factories/explicit grid the engine itself uses. X-axis fully hidden (xAxis.show:false), horizontal gridlines only, tooltip shows a vertical-swatch + bare value via lineSwatchValueTooltipFormatter. Same minor non-reactive-theme-color caveat as chartLineDots (resolved once at mount). Direct-source-diff fix (2026-07-05): Line stroke was a flat neutral gray — upstream strokes the line in the series' own chart-2/secondary color. Fixed.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-dots-colors.ts [chartLineDotsColors]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
