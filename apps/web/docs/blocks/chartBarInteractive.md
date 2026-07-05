---
title: "@domphy/blocks — chartBarInteractive"
description: "Mirrors the pre-existing chart-line-interactive.ts pattern: a header aside with two clickable stat tiles (label + locale-formatted running total over the FULL..."
---

# chartBarInteractive

<script setup lang="ts">
import ChartBarInteractiveDemo from "../demos/blocks/chartBarInteractive.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarInteractive()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarInteractiveDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `data` | `ChartBarDailyPoint[]` | — |
| `initialSeries` | `SeriesKey` | — |
| `desktopLabel` | `string` | — |
| `desktopColor` | `ThemeColor` | — |
| `mobileLabel` | `string` | — |
| `mobileColor` | `ThemeColor` | — |

::: details Implementation notes
Mirrors the pre-existing chart-line-interactive.ts pattern: a header aside with two clickable stat tiles (label + locale-formatted running total over the FULL dataset, computed once) that swap which daily series (desktop/mobile) is plotted via a reactive `toState&lt;ChartOption&gt;` fed into `chart()`, with data-active styling on the selected tile (verified by the click-to-switch test). ~90 days of bars, horizontal split lines only, axisPointer:'shadow' cursor column, no footer (the header's tabs take over that role per spec). Two approximations: (1) switching series re-tweens via the same clip-path sweep-reveal used on mount rather than a true bar-height tween (no engine hook for animating bar geometry). (2) AxisLabelOption.formatter is declared on the type but never read by the axis renderer (verified against overlay/axes.ts — only the raw tick string is drawn), so short date labels ('Apr 1') are pre-formatted directly into the category array fed to xAxis.data instead of relying on that (inert) formatter hook; this is also flagged as a reusable finding in chart-bar-shared.ts since the pre-existing chart-line-interactive.ts file relies on the same non-functional formatter option for its own date axis.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-interactive.ts [chartBarInteractive]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
