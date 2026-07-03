---
title: "@domphy/blocks — chartAreaStep"
description: "Single-series staircase area (LineSeriesOption step:'end', horizontal-then-vertical segments per the engine's buildPixelPoints step logic), plus an optional..."
---

# chartAreaStep

<script setup lang="ts">
import ChartAreaStepDemo from "../demos/blocks/chartAreaStep.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaStep()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaStepDemo" />

::: details Implementation notes
Single-series staircase area (LineSeriesOption step:'end', horizontal-then-vertical segments per the engine's buildPixelPoints step logic), plus an optional seriesIcon prop that swaps the footer's default trend arrow for a caller-chosen icon (demonstrating 'attaching an icon to the series definition' per spec, since @domphy/chart's LineSeriesOption itself has no icon field). Same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-step.ts [chartAreaStep]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
