---
title: "@domphy/blocks — chartPieDonutActive"
description: "One wedge (activeKey, defaults to the first record) is statically drawn with +10 outer-radius units and a thicker stroke (2.5 vs 1.5) at build time, per the..."
---

# chartPieDonutActive

<script setup lang="ts">
import ChartPieDonutActiveDemo from "../demos/blocks/chartPieDonutActive.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieDonutActive()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieDonutActiveDemo" />

::: details Implementation notes
One wedge (activeKey, defaults to the first record) is statically drawn with +10 outer-radius units and a thicker stroke (2.5 vs 1.5) at build time, per the spec's explicit instruction that this recipe is a static showcase and must NOT be wired to hover/click (that behavior belongs to chartPieInteractive). Hover tooltips still work normally on every wedge. Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-donut-active.ts [chartPieDonutActive]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
