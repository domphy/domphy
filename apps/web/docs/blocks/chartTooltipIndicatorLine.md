---
title: "@domphy/blocks — chartTooltipIndicatorLine"
description: "Full port."
---

# chartTooltipIndicatorLine

<script setup lang="ts">
import ChartTooltipIndicatorLineDemo from "../demos/blocks/chartTooltipIndicatorLine.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipIndicatorLine()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipIndicatorLineDemo" />

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
Full port. Default date header kept; indicator set to the shared 'line' style (a short vertical color bar) via activityTooltipFormatter's single indicator enum ('dot'|'square'|'line'|'icon'|'none'), the same code path all indicator-style recipes in this family share.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-indicator-line.ts [chartTooltipIndicatorLine]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
