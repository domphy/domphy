---
title: "@domphy/blocks — chartRadialShape"
description: "Single-value static gauge (renderRadialGauge in chart-radial-shared.ts): one flat-capped arc (~100/360deg default) over a muted background track, framed by two..."
---

# chartRadialShape

<script setup lang="ts">
import ChartRadialShapeDemo from "../demos/blocks/chartRadialShape.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadialShape()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadialShapeDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `value` | `number` | — |
| `color` | `ThemeColor` | — |
| `captionText` | `string` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `footerCaptionText` | `string` | — |
| `sweepDegrees` | `number` | — |
| `innerRadiusRatio` | `number` | — |
| `showDecorativeCircles` | `boolean` | — |
| `showBackgroundTrack` | `boolean` | — |

::: details Implementation notes
Single-value static gauge (renderRadialGauge in chart-radial-shared.ts): one flat-capped arc (~100/360deg default) over a muted background track, framed by two thin decorative circles — one just outside in a muted tone, one just inside using the ambient 'inherit' surface tone so it visually blends with the card background (spec's 'page/card background color' framing ring). Center value+caption rendered as an absolutely-positioned HTML overlay using heading()+small() ui patches (h2 for the large bold number) rather than SVG &lt;text&gt;, avoiding inline-typography entirely. No tooltip/interaction, matching the spec. tsc --noEmit clean; 2/2 tests pass.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radial)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radial-shape.ts [chartRadialShape]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
