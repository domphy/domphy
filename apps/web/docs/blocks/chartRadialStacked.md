---
title: "@domphy/blocks — chartRadialStacked"
description: "Half-circle (180deg, startAngle -90) two-segment gauge (renderRadialStackedGauge): segments share one thick band (innerRadiusRatio 0.75) and are drawn..."
---

# chartRadialStacked

<script setup lang="ts">
import ChartRadialStackedDemo from "../demos/blocks/chartRadialStacked.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadialStacked()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadialStackedDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `segments` | `RadialSeriesDatum[]` | — |
| `totalCaptionText` | `string` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `footerCaptionText` | `string` | — |
| `sweepDegrees` | `number` | — |
| `innerRadiusRatio` | `number` | — |

::: details Implementation notes
Half-circle (180deg, startAngle -90) two-segment gauge (renderRadialStackedGauge): segments share one thick band (innerRadiusRatio 0.75) and are drawn back-to-back with round caps and a small angular gap between them. FIDELITY NOTE: the spec describes 'gently rounded [segment] ends' plus 'a thin border in the page background color separating the two segments' — this is approximated as a single small (1.5deg default, configurable) rounded-cap gap at the shared boundary rather than drawing a literal thin divider stroke, which reads as very similar visually (two rounded-cap pill segments meeting almost end-to-end) without needing a third overlay stroke layer. Center total (sum of segment values) + caption uses the same HTML-overlay heading()/small() treatment as chartRadialShape/Text, positioned within the dome's own bounding area. Hover tooltip (swatch + segment label) reuses the shared radial tooltip controller. tsc --noEmit clean; 2/2 tests pass.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radial)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radial-stacked.ts [chartRadialStacked]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
