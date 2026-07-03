---
title: "@domphy/blocks — chartBarStacked"
description: "Two series sharing one `stack` id, one bar per month, horizontal split lines only, a swatch+label legend row hand-built below the plot (the engine's own..."
---

# chartBarStacked

<script setup lang="ts">
import ChartBarStackedDemo from "../demos/blocks/chartBarStacked.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarStacked()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarStackedDemo" />

::: details Implementation notes
Two series sharing one `stack` id, one bar per month, horizontal split lines only, a swatch+label legend row hand-built below the plot (the engine's own built-in legend overlay only supports a fixed geometric-symbol vocabulary and lives inside the SVG layer rather than the card's DOM flow — same rationale as the sibling chart-area-legend.ts recipe), and a custom tooltip formatter (chartBarStackedTooltipFormatter) that lists both segment values plus a computed Total row. `showLegend` toggle verified in the test suite.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-stacked.ts [chartBarStacked]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
