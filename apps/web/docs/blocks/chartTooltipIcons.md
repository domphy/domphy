---
title: "@domphy/blocks — chartTooltipIcons"
description: "Full port."
---

# chartTooltipIcons

<script setup lang="ts">
import ChartTooltipIconsDemo from "../demos/blocks/chartTooltipIcons.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipIcons()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipIconsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ActivityDayPoint[]` | — |
| `series` | `ActivitySeriesEntry[]` | — |
| `showCursor` | `boolean` | — |
| `defaultOpenIndex` | `number \| null` | — |
| `title` | `string` | — |
| `description` | `string` | — |

::: details Implementation notes
Full port. Header hidden; each series entry in ACTIVITY_SERIES_CONFIG carries an original inline-SVG iconMarkup string (an abstract footprint glyph for running, a wave glyph for swimming), colored via the row's resolved series color and substituted in place of the dot indicator through the shared indicator-style switch, matching the spec's 'icon present overrides the default dot' behavior.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-icons.ts [chartTooltipIcons]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
