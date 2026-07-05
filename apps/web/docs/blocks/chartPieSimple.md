---
title: "@domphy/blocks — chartPieSimple"
description: "Full pie: card chrome (centered title/date-range subtitle), 5 theme-palette wedges, cursor-following tooltip (swatch+name+value), footer trend line with an..."
---

# chartPieSimple

<script setup lang="ts">
import ChartPieSimpleDemo from "../demos/blocks/chartPieSimple.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieSimple()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieSimpleDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `PieDatum[]` | Category records — falls back to a five-browser illustrative sample. |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendValue` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |
| `caption` | `string` | — |
| `valueFormatter` | `(value: number) =&gt; string` | — |

::: details Implementation notes
Full pie: card chrome (centered title/date-range subtitle), 5 theme-palette wedges, cursor-following tooltip (swatch+name+value), footer trend line with an original up/down glyph. Mount 'sweep' is approximated as a group-level scale(0.7→1)+opacity entrance via the motion() patch (Web Animations API, ease-out ~700ms) rather than a literal per-wedge 0°→full° angular growth: animating an SVG path's 'd' via WAA has inconsistent cross-browser support and jsdom has no Element.animate at all, so a true angular sweep couldn't be verified. Visually reads as the chart 'growing in' on mount with the spec's duration/easing.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-simple.ts [chartPieSimple]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
