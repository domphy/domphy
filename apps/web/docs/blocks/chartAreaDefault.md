---
title: "@domphy/blocks — chartAreaDefault"
description: "Fully functional: card shell, hidden y-axis, bare month labels, smooth single-series area fill (opacity 0.4), axis-trigger tooltip (custom formatter shows..."
---

# chartAreaDefault

<script setup lang="ts">
import ChartAreaDefaultDemo from "../demos/blocks/chartAreaDefault.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaDefault()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaDefaultDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartAreaSinglePoint[]` | — |
| `seriesLabel` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
Fully functional: card shell, hidden y-axis, bare month labels, smooth single-series area fill (opacity 0.4), axis-trigger tooltip (custom formatter shows category label + value, since @domphy/chart's built-in tooltip never prints the axis label and TooltipParams.axisValueLabel is unpopulated at runtime), trend footer. Marked partial only because the spec's mount-time 'draws in over ease-out duration' reveal is approximated with a container-level clip-path wipe (via @domphy/ui motion()) rather than a true per-vertex SVG/WebGL path animation — @domphy/chart's LineRenderer has no such hook today. All other behavior is genuine, not stubbed.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-default.ts [chartAreaDefault]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
