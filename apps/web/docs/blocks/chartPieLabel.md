---
title: "@domphy/blocks — chartPieLabel"
description: "Adds outside category-name labels with thin leader lines (own trigonometry-based placement, hidden below a minLabelFraction to avoid crowding) and suppresses..."
---

# chartPieLabel

<script setup lang="ts">
import ChartPieLabelDemo from "../demos/blocks/chartPieLabel.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieLabel()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieLabelDemo" />

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
| `leaderLine` | `boolean` | Toggle the leader lines connecting each wedge to its label. Defaults to true. |
| `minLabelFraction` | `number` | Slices smaller than this fraction of the total are left unlabeled to avoid crowding. |

::: details Implementation notes
Adds outside category-name labels with thin leader lines (own trigonometry-based placement, hidden below a minLabelFraction to avoid crowding) and suppresses the duplicate name in the tooltip (showName:false, value-only). Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-label.ts [chartPieLabel]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
