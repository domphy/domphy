---
title: "@domphy/blocks — chartLineLabelCustom"
description: "Colored per-point dots via the same staticPointMarkersOverlay technique as chartLineDotsColors (see its notes on why a custom overlay is needed)."
---

# chartLineLabelCustom

<script setup lang="ts">
import ChartLineLabelCustomDemo from "../demos/blocks/chartLineLabelCustom.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineLabelCustom()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineLabelCustomDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `description` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `data` | `CategoryPoint[]` | — |
| `trendHeadline` | `string` | — |
| `trendSubtitle` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |

::: details Implementation notes
Colored per-point dots via the same staticPointMarkersOverlay technique as chartLineDotsColors (see its notes on why a custom overlay is needed). The always-on display-name label reuses the engine's native label.formatter (a genuine built-in feature) with a formatter that looks up each point's friendly name from the data array by dataIndex, rather than showing the raw category key or numeric value. Direct-source-diff fix (2026-07-05): Line stroke was neutral gray (should be secondary/chart-2) and per-point dots were multicolored by browser — upstream's 'custom' variant is the per-point NAME label, with uniform chart-2 dots, not multicolor ones. Both fixed.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-label-custom.ts [chartLineLabelCustom]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
