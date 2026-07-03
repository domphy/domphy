---
title: "@domphy/blocks — chartAreaLinear"
description: "Identical structure to chartAreaDefault with smooth:false (straight point-to-point segments)."
---

# chartAreaLinear

<script setup lang="ts">
import ChartAreaLinearDemo from "../demos/blocks/chartAreaLinear.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaLinear()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaLinearDemo" />

::: details Implementation notes
Identical structure to chartAreaDefault with smooth:false (straight point-to-point segments). Same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-linear.ts [chartAreaLinear]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
