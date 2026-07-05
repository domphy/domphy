---
title: "@domphy/blocks — chartLineMultiple"
description: "Two smooth lines sharing one category axis, no dots (showSymbol:false both), cursor highlight suppressed (axisPointer:'none')."
---

# chartLineMultiple

<script setup lang="ts">
import ChartLineMultipleDemo from "../demos/blocks/chartLineMultiple.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineMultiple()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineMultipleDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `description` | `string` | — |
| `primarySeriesLabel` | `string` | — |
| `primarySeriesColor` | `ThemeColor` | — |
| `secondarySeriesLabel` | `string` | — |
| `secondarySeriesColor` | `ThemeColor` | — |
| `data` | `MonthlyPoint[]` | — |
| `trendHeadline` | `string` | — |
| `trendSubtitle` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |

::: details Implementation notes
Two smooth lines sharing one category axis, no dots (showSymbol:false both), cursor highlight suppressed (axisPointer:'none'). Uses the engine's own DEFAULT tooltip formatter (left unset) which already renders a swatch+label+value row per series — exactly the richer multi-series tooltip the spec describes, no custom formatter needed.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-multiple.ts [chartLineMultiple]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
