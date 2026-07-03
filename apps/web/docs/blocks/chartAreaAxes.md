---
title: "@domphy/blocks — chartAreaAxes"
description: "Two-series overlapping area chart with a real sparse y-axis (splitNumber:3, no axis line/tick, floating labels) and horizontal-only gridlines (yAxis.splitLine..."
---

# chartAreaAxes

<script setup lang="ts">
import ChartAreaAxesDemo from "../demos/blocks/chartAreaAxes.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaAxes()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaAxesDemo" />

::: details Implementation notes
Two-series overlapping area chart with a real sparse y-axis (splitNumber:3, no axis line/tick, floating labels) and horizontal-only gridlines (yAxis.splitLine on, xAxis.splitLine off) via @domphy/chart's native AxisOption/GridOption support — no approximation needed for the axes themselves. Same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-axes.ts [chartAreaAxes]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
