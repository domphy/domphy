---
title: "@domphy/blocks — chartTooltipLabelFormatter"
description: "Full port."
---

# chartTooltipLabelFormatter

<script setup lang="ts">
import ChartTooltipLabelFormatterDemo from "../demos/blocks/chartTooltipLabelFormatter.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipLabelFormatter()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipLabelFormatterDemo" />

::: details Implementation notes
Full port. Two independent formatter callbacks: `labelFormatter` (default formatLongDate → 'July 15, 2024') drives the tooltip header, while `xAxisLabelFormatter` (default formatWeekdayShort → 'Mon') independently drives the x-axis tick labels — both operate on the same underlying ISO date field but are never conflated into one shared formatter, per the spec's research note.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-label-formatter.ts [chartTooltipLabelFormatter]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
