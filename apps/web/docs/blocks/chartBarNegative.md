---
title: "@domphy/blocks — chartBarNegative"
description: "Bars diverge above/below zero depending on sign; per-datapoint color is resolved via `familyHex()` (a theme-token-derived hex, matching the established..."
---

# chartBarNegative

<script setup lang="ts">
import ChartBarNegativeDemo from "../demos/blocks/chartBarNegative.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarNegative()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarNegativeDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartBarPoint[]` | — |
| `seriesLabel` | `string` | — |
| `positiveColor` | `ThemeColor` | — |
| `negativeColor` | `ThemeColor` | — |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
Bars diverge above/below zero depending on sign; per-datapoint color is resolved via `familyHex()` (a theme-token-derived hex, matching the established chart-option-color idiom already used by chart-area-shared.ts's chartColorRgba — WebGL per-item itemStyle.color must be a literal hex, not a reactive theme function) and passed as {value, itemStyle:{color}} per bar. A markLine at yAxis:0 draws the dashed zero baseline (dash style/color are the engine's own fixed markLine styling, not independently configurable). Each bar's month label is drawn just outside its own tip (above for positive, below for negative) via a dedicated SVG overlay (chartBarSignedLabelOverlay), since the engine's built-in bar-label renderer only supports a flat 'top'/'inside'/'bottom' position with no sign-aware branching. Tooltip cursor is axisPointer:'none' per spec (no separate value axis — the zero line is the only baseline).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-negative.ts [chartBarNegative]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
