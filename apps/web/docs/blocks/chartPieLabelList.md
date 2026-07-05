---
title: "@domphy/blocks — chartPieLabelList"
description: "Small (font-size 9) display-name labels sit just outside each wedge's rim, sourced from an explicit displayNameLookup Record (raw key -> readable name) rather..."
---

# chartPieLabelList

<script setup lang="ts">
import ChartPieLabelListDemo from "../demos/blocks/chartPieLabelList.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieLabelList()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieLabelListDemo" />

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
| `displayNameLookup` | `Record&lt;string, string&gt;` | Maps each category's raw `key` to the readable text printed on the chart. |
| `labelFontSize` | `string` | SVG font-size (viewBox units) for the on-chart labels. |

::: details Implementation notes
Small (font-size 9) display-name labels sit just outside each wedge's rim, sourced from an explicit displayNameLookup Record (raw key -&gt; readable name) rather than the raw data key, with a fallback to datum.name when a key is missing. No leader lines, no legend block. Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-label-list.ts [chartPieLabelList]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
