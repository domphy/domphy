---
title: "@domphy/blocks — chartLineStep"
description: "Identical to chartLineDefault with LineSeriesOption.step (default 'start', exposed as a stepMode prop)."
---

# chartLineStep

<script setup lang="ts">
import ChartLineStepDemo from "../demos/blocks/chartLineStep.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineStep()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineStepDemo" />

::: details Implementation notes
Identical to chartLineDefault with LineSeriesOption.step (default 'start', exposed as a stepMode prop). Same mount-reveal approximation as chartLineDefault.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-step.ts [chartLineStep]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
