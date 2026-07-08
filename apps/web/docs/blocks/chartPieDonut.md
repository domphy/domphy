---
title: "@domphy/blocks — chartPieDonut"
description: "Same card/header/footer chrome as chartPieSimple with an annulus (ring) shape instead of a solid disc; innerRadius is a configurable prop (defaults to ~60% of..."
---

# chartPieDonut

<script setup lang="ts">
import ChartPieDonutDemo from "../demos/blocks/chartPieDonut.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieDonut()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieDonutDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `PieDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendValue` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |
| `caption` | `string` | — |
| `valueFormatter` | `(value: number) =&gt; string` | — |
| `innerRadius` | `number` | Ring thickness control: smaller = thicker ring, larger = thinner ring. Default mirrors upstream's `innerRadius={60}` against Recharts' default `outerRadius='80%'` (~100px on the max-h-[250px] square), i.e. a hole of ~0.6 of the outer radius (the shared DEFAULT_DONUT_INNER_RADIUS). |

::: details Implementation notes
Same card/header/footer chrome as chartPieSimple with an annulus (ring) shape instead of a solid disc; innerRadius is a configurable prop (defaults to ~60% of the outer radius (upstream innerRadius=60 vs ~100 outer), matching the spec's 'moderate inner radius' guidance). Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-donut.ts [chartPieDonut]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
