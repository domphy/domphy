---
title: "@domphy/blocks — chartPieLabelCustom"
description: "Bold, high-contrast (theme-token near-white) numeric label computed per wedge from cos/sin of the midpoint angle at a configurable radius fraction, printed..."
---

# chartPieLabelCustom

<script setup lang="ts">
import ChartPieLabelCustomDemo from "../demos/blocks/chartPieLabelCustom.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieLabelCustom()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieLabelCustomDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `PieDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendValue` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |
| `caption` | `string` | — |
| `labelFormatter` | `(value: number) =&gt; string` | Formats the raw value printed on each wedge. Defaults to a plain number. |
| `labelRadiusFraction` | `number` | Fraction of the outer radius the label sits at (0 = center, 1 = rim). |

::: details Implementation notes
Bold, high-contrast (theme-token near-white) numeric label computed per wedge from cos/sin of the midpoint angle at a configurable radius fraction, printed directly on the wedge fill. Tooltip is trimmed to just the category name (repurposes the tooltip's 'value' slot for the name text since the raw number is already on the wedge). Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-label-custom.ts [chartPieLabelCustom]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
