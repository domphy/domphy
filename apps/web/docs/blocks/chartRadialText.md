---
title: "@domphy/blocks — chartRadialText"
description: "Parameter preset of the same renderRadialGauge used by chartRadialShape: thinner band (innerRadiusRatio 0.85 vs 0.66), larger sweep (250deg vs 100deg default)..."
---

# chartRadialText

<script setup lang="ts">
import ChartRadialTextDemo from "../demos/blocks/chartRadialText.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadialText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadialTextDemo" />

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
Parameter preset of the same renderRadialGauge used by chartRadialShape: thinner band (innerRadiusRatio 0.85 vs 0.66), larger sweep (250deg vs 100deg default) and round caps (capStyle:'round') instead of flat, per the researchNote's guidance to treat shape/text as two presets of one underlying single-value gauge. Same decorative framing circles, background track, and HTML-overlay center value/caption as chartRadialShape; no tooltip/interaction, matching the spec. tsc --noEmit clean; 2/2 tests pass.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radial)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radial-text.ts [chartRadialText]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
