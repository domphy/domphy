---
title: "@domphy/blocks — chartPieStacked"
description: "Two concentric rings (inner 30->56, outer 56->86 viewBox units, contiguous with no gap band) share the same category order and index-based color mapping so..."
---

# chartPieStacked

<script setup lang="ts">
import ChartPieStackedDemo from "../demos/blocks/chartPieStacked.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieStacked()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieStackedDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `PieStackedDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendValue` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |
| `caption` | `string` | — |
| `valueFormatter` | `(value: number) =&gt; string` | — |
| `innerSeriesLabel` | `string` | — |
| `outerSeriesLabel` | `string` | — |

::: details Implementation notes
Two concentric rings (inner 30-&gt;56, outer 56-&gt;86 viewBox units, contiguous with no gap band) share the same category order and index-based color mapping so both rings visibly agree per category; each ring's own metric normalizes its own 360 degrees independently (own judgment — the spec did not require synchronized angles across rings, only radial continuity). Tooltip uses a thin line marker instead of a filled swatch and prefixes the category with the ring's own series label (e.g. 'Sessions'), per spec. Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-stacked.ts [chartPieStacked]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
