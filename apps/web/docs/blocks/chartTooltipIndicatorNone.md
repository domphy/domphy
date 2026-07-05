---
title: "@domphy/blocks — chartTooltipIndicatorNone"
description: "Full port."
---

# chartTooltipIndicatorNone

<script setup lang="ts">
import ChartTooltipIndicatorNoneDemo from "../demos/blocks/chartTooltipIndicatorNone.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipIndicatorNone()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipIndicatorNoneDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ActivityDayPoint[]` | — |
| `series` | `ActivitySeriesEntry[]` | — |
| `showCursor` | `boolean` | — |
| `defaultOpenIndex` | `number \| null` | — |
| `title` | `string` | — |
| `description` | `string` | — |

::: details Implementation notes
Full port. Default date header kept; indicator set to 'none' so rows render as bare series-name + value pairs, using the same shared indicator switch as the other indicator-style recipes.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-indicator-none.ts [chartTooltipIndicatorNone]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
