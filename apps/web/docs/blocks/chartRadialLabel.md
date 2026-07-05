---
title: "@domphy/blocks — chartRadialLabel"
description: "Same ring-chart base as chartRadialSimple (renderRadialRingsChart, sweepMode:'extended'): sweep is scaled across a domain running from just before the top to..."
---

# chartRadialLabel

<script setup lang="ts">
import ChartRadialLabelDemo from "../demos/blocks/chartRadialLabel.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadialLabel()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadialLabelDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `RadialSeriesDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `showBackgroundTrack` | `boolean` | — |
| `showInlineLabels` | `boolean` | — |
| `minSweepDegrees` | `number` | — |
| `maxSweepDegrees` | `number` | — |

::: details Implementation notes
Same ring-chart base as chartRadialSimple (renderRadialRingsChart, sweepMode:'extended'): sweep is scaled across a domain running from just before the top to ~380deg (20deg past a full turn) with a minSweepDegrees floor (default 40) so every ring — even the smallest — keeps enough arc length for its label. Inline per-ring category labels are rendered as always-visible HTML &lt;small&gt; elements positioned near each arc's leading edge via percentage coordinates computed from the same SVG coordinate space (not SVG &lt;text&gt;, so they can reuse the small() ui patch and stay legible without touching inline typography styles), colored with a light theme tone (shift-1 of the ring's own accent) rather than the upstream's mix-blend-mode trick — matches the researchNote's own suggested clean-room simplification ('light/dark label color based on contrast'). Same tooltip-on-hover behavior as chartRadialSimple. tsc --noEmit clean; 2/2 tests pass.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radial)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radial-label.ts [chartRadialLabel]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
