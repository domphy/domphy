---
title: "@domphy/blocks — chartAreaGradient"
description: "Two overlapping series, each with a real top-to-baseline fading linear gradient fill (GradientObject, stops built from themeColorToken()-derived rgba, ~0.8 to..."
---

# chartAreaGradient

<script setup lang="ts">
import ChartAreaGradientDemo from "../demos/blocks/chartAreaGradient.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaGradient()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaGradientDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartAreaTwoSeriesPoint[]` | — |
| `series` | `ChartAreaGradientSeries[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
Two overlapping series, each with a real top-to-baseline fading linear gradient fill (GradientObject, stops built from themeColorToken()-derived rgba, ~0.8 to ~0.1 alpha) plus solid outline stroke; multi-series tooltip with color dots. Same mount-reveal approximation caveat as chartAreaDefault (clip-path wipe, not a per-path draw-in). Direct-source-diff fix (2026-07-05): Two-series fill was overlapping instead of stacked (upstream stacks both under one stackId), and horizontal gridlines were missing. Both fixed.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-gradient.ts [chartAreaGradient]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
