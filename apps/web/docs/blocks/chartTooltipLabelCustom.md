---
title: "@domphy/blocks — chartTooltipLabelCustom"
description: "Full port."
---

# chartTooltipLabelCustom

<script setup lang="ts">
import ChartTooltipLabelCustomDemo from "../demos/blocks/chartTooltipLabelCustom.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipLabelCustom()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipLabelCustomDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ActivityDayPoint[]` | — |
| `series` | `ActivitySeriesEntry[]` | — |
| `showCursor` | `boolean` | — |
| `defaultOpenIndex` | `number \| null` | — |
| `groupLabel` | `string` | — |
| `title` | `string` | — |
| `description` | `string` | — |

::: details Implementation notes
Full port. Header pulls from a fixed `groupLabel` prop (default 'Activities') via a dedicated labelMode:'static' lookup path, independent of the hovered column's date and independent of the per-row series-name key, combined with the line indicator style.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-label-custom.ts [chartTooltipLabelCustom]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
