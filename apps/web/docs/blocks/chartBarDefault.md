---
title: "@domphy/blocks — chartBarDefault"
description: "Card + single-series vertical bar chart via @domphy/chart's chart() engine (packages/chart), with axis-trigger tooltip (formatter shows month+value),..."
---

# chartBarDefault

<script setup lang="ts">
import ChartBarDefaultDemo from "../demos/blocks/chartBarDefault.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarDefault()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarDefaultDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartBarPoint[]` | — |
| `seriesLabel` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `showTrendIcon` | `boolean` | — |
| `captionText` | `string` | — |
| `cornerRadius` | `number` | Bar corner radius, px. NOTE: |
| `height` | `number` | — |

::: details Implementation notes
Card + single-series vertical bar chart via @domphy/chart's chart() engine (packages/chart), with axis-trigger tooltip (formatter shows month+value), axisPointer:'shadow' for the hover column highlight, hidden y-axis with visible horizontal split lines, and a trend footer. Two approximations, both documented in chart-bar-shared.ts: (1) BarRenderer (packages/chart/src/gl/BarRenderer.ts) hardcodes a fixed 2px bar corner radius and never reads a bar's itemStyle.borderRadius, so the `cornerRadius` prop (default 8) is forwarded into the chart option for forward-compatibility but currently has no visible effect — bars always render with the engine's fixed 2px radius. (2) The engine has no per-bar 'grow from 0' height tween, so the spec's mount reveal is approximated with a clip-path wipe across the whole plot (via @domphy/ui's motion()) rather than a true per-bar tween. The hover-highlight rectangle is also a fixed 40px-wide shadow band (engine's axisPointer:'shadow' behavior), not sized to the exact bar width. Direct-source-diff fix (2026-07-05): Hover cursor rectangle was enabled — upstream disables it (cursor={false}) since the tooltip alone carries the hover feedback. Fixed.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-default.ts [chartBarDefault]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
