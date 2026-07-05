---
title: "@domphy/blocks — chartLineDots"
description: "Resting dots use @domphy/chart's built-in line-symbol renderer (showSymbol/symbolSize)."
---

# chartLineDots

<script setup lang="ts">
import ChartLineDotsDemo from "../demos/blocks/chartLineDots.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineDots()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineDotsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `description` | `string` | — |
| `seriesLabel` | `string` | — |
| `seriesColor` | `ThemeColor` | — |
| `data` | `MonthlyPoint[]` | — |
| `dotRadius` | `number` | — |
| `activeDotRadius` | `number` | — |
| `trendHeadline` | `string` | — |
| `trendSubtitle` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |

::: details Implementation notes
Resting dots use @domphy/chart's built-in line-symbol renderer (showSymbol/symbolSize). The hover-enlarging active dot is a genuine custom feature (not a static approximation): a companion SVG overlay (hoverDotOverlay in chart-line-shared.ts) listens for mousemove on the plot wrapper, finds the nearest column using the SAME public scale factories (createOrdinalScale/createLinearScale, exported from @domphy/chart) and an explicit shared grid/y-domain so it lands pixel-exact on the line, then grows a circle into view — because @domphy/chart's built-in symbol renderer has no per-point hover state or size override. Minor gap: the overlay's fill color is resolved once at mount via themeColorToken(null, ...) (design-time), so it will not live-update on a runtime light/dark theme toggle — the same non-reactivity already exists throughout @domphy/chart's own axis/grid color resolution, so this isn't a new regression. Direct-source-diff fix (2026-07-05): Resting point markers used the chart engine's built-in symbol, which is a hardcoded hollow white-fill donut — upstream's dots are solid-filled. Replaced with a solid-filled marker overlay.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-dots.ts [chartLineDots]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
