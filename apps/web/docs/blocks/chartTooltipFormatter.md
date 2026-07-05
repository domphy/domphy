---
title: "@domphy/blocks — chartTooltipFormatter"
description: "Full port."
---

# chartTooltipFormatter

<script setup lang="ts">
import ChartTooltipFormatterDemo from "../demos/blocks/chartTooltipFormatter.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipFormatter()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipFormatterDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `ActivityDayPoint[]` | — |
| `series` | `ActivitySeriesEntry[]` | — |
| `showCursor` | `boolean` | — |
| `defaultOpenIndex` | `number \| null` | — |
| `unit` | `string` | — |
| `minRowWidthPx` | `number` | — |
| `title` | `string` | — |
| `description` | `string` | — |

::: details Implementation notes
Full port. Default header kept; each row's value goes through monoUnitValueRenderer (tabular/monospace number + small muted unit suffix) wrapped in a min-width span so digits realign as values change length. Shares the exact same value-cell renderer function as chartTooltipAdvanced, deliberately separated from the total-row/no-header behavior per the family's own research note that formatter and total-row are two independently composable capabilities. Direct-source-diff fix (2026-07-05): Rendered a date header row and a color-dot swatch — upstream uses hideLabel plus a custom formatter with no indicator at all. Set indicator:'none' + showLabel:false.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-formatter.ts [chartTooltipFormatter]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
