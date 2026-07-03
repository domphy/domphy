---
title: "@domphy/blocks — chartAreaStacked"
description: "Two flat-fill series sharing a stack id; engine's own accumStackedLines() computes the cumulative baseline, and the axis tooltip correctly shows each series'..."
---

# chartAreaStacked

<script setup lang="ts">
import ChartAreaStackedDemo from "../demos/blocks/chartAreaStacked.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaStacked()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaStackedDemo" />

::: details Implementation notes
Two flat-fill series sharing a stack id; engine's own accumStackedLines() computes the cumulative baseline, and the axis tooltip correctly shows each series' individual (non-cumulative) value since the engine's tooltip hit-test reads the raw pre-stack series data. Same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-stacked.ts [chartAreaStacked]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
