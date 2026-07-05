---
title: "@domphy/blocks — chartLineLinear"
description: "Identical to chartLineDefault except smooth:false/step:false (straight segments)."
---

# chartLineLinear

<script setup lang="ts">
import ChartLineLinearDemo from "../demos/blocks/chartLineLinear.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineLinear()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineLinearDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `description` | `string` | — |
| `seriesLabel` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `data` | `MonthlyPoint[]` | — |
| `trendHeadline` | `string` | — |
| `trendSubtitle` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |

::: details Implementation notes
Identical to chartLineDefault except smooth:false/step:false (straight segments). Same mount-reveal approximation as chartLineDefault.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-linear.ts [chartLineLinear]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
