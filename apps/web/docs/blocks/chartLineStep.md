---
title: "@domphy/blocks — chartLineStep"
description: "Identical to chartLineDefault with LineSeriesOption.step (default 'start', exposed as a stepMode prop)."
---

# chartLineStep

<script setup lang="ts">
import ChartLineStepDemo from "../demos/blocks/chartLineStep.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineStep()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineStepDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `description` | `string` | — |
| `seriesLabel` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `data` | `MonthlyPoint[]` | — |
| `stepMode` | `NonNullable&lt;LineSeriesOption["step"]&gt;` | Where the vertical jump sits relative to each pair of points. Defaults to "middle" (the jump happens midway between adjacent points — matches the upstream block's d3 `curveStep`). |
| `trendHeadline` | `string` | — |
| `trendSubtitle` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |

::: details Implementation notes
Identical to chartLineDefault with LineSeriesOption.step (default 'start', exposed as a stepMode prop). Same mount-reveal approximation as chartLineDefault. Direct-source-diff fix (2026-07-05): Step interpolation used the wrong mode — upstream's recharts type="step" is a curveStep (jump at the midpoint), matched here by switching stepMode from 'start' to 'middle'.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-step.ts [chartLineStep]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
