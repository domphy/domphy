---
title: "@domphy/blocks — chartPieLegend"
description: "No on-slice labels; a wrapped CSS-grid legend (configurable column count, default 4) of swatch+name pairs sits beneath the chart with a themeSpacing(-6)..."
---

# chartPieLegend

<script setup lang="ts">
import ChartPieLegendDemo from "../demos/blocks/chartPieLegend.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieLegend()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieLegendDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `PieDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `legendColumns` | `number` | Number of equal-width legend columns. Defaults to 4. |

::: details Implementation notes
No on-slice labels; a wrapped CSS-grid legend (configurable column count, default 4) of swatch+name pairs sits beneath the chart with a themeSpacing(-6) negative top margin so it visually hugs the circle instead of floating at the container's default gap. No footer trend line in this variant (legend takes that slot), matching the spec. Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-legend.ts [chartPieLegend]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
