---
title: "@domphy/blocks — chartPieDonut"
description: "Same card/header/footer chrome as chartPieSimple with an annulus (ring) shape instead of a solid disc; innerRadius is a configurable prop (defaults to ~42% of..."
---

# chartPieDonut

<script setup lang="ts">
import ChartPieDonutDemo from "../demos/blocks/chartPieDonut.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieDonut()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieDonutDemo" />

::: details Implementation notes
Same card/header/footer chrome as chartPieSimple with an annulus (ring) shape instead of a solid disc; innerRadius is a configurable prop (defaults to ~42% of the outer radius, matching the spec's 'moderate inner radius' guidance). Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-donut.ts [chartPieDonut]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
