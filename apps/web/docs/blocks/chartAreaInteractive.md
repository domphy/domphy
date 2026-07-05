---
title: "@domphy/blocks — chartAreaInteractive"
description: "Taller card with a native <select> range control (7/30/90-day presets) in the card's aside grid area, collapsing via @media on narrow viewports."
---

# chartAreaInteractive

<script setup lang="ts">
import ChartAreaInteractiveDemo from "../demos/blocks/chartAreaInteractive.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaInteractive()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaInteractiveDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ChartAreaDailyPoint[]` | — |
| `series` | `ChartAreaInteractiveSeries[]` | — |
| `rangePresets` | `ChartRangePreset[]` | — |
| `defaultRangeDays` | `number` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `height` | `number` | — |

::: details Implementation notes
Taller card with a native &lt;select&gt; range control (7/30/90-day presets) in the card's aside grid area, collapsing via @media on narrow viewports. Selecting a preset slices a deterministically-generated ~92-day daily dataset (anchored to a fixed end date, not real 'today', per the spec's research note) and swaps the chart's reactive ChartOption state; the mount-reveal clip-path wipe is manually replayed via the DOM node's own .animate() call on each range change (motion() only plays its enter animation once, on mount, so this recipe drives WAAPI directly for the re-draw transition). No trend footer, per the spec's research note that this recipe relies on the header description instead. Same underlying mount-reveal-is-a-wipe-not-a-true-path-animation caveat as chartAreaDefault. Direct-source-diff fix (2026-07-05): Two-series fill wasn't stacked, the bottom legend upstream shows was missing entirely, and horizontal gridlines were missing. All three fixed.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-interactive.ts [chartAreaInteractive]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
