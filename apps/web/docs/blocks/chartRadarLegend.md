---
title: "@domphy/blocks — chartRadarLegend"
description: "Reuses chartLegendRow from chart-area-shared.ts for the swatch+label legend row; the plot container gets a negative bottom margin and the legend row extra top..."
---

# chartRadarLegend

<script setup lang="ts">
import ChartRadarLegendDemo from "../demos/blocks/chartRadarLegend.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarLegend()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarLegendDemo" />

::: details Implementation notes
Reuses chartLegendRow from chart-area-shared.ts for the swatch+label legend row; the plot container gets a negative bottom margin and the legend row extra top padding, matching the spec's 'nudged upward, legend hugs it' description without an exact upstream pixel match (own judgment used for the offset magnitude).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-legend.ts [chartRadarLegend]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
