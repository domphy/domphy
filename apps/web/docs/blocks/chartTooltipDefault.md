---
title: "@domphy/blocks — chartTooltipDefault"
description: "Full port."
---

# chartTooltipDefault

<script setup lang="ts">
import ChartTooltipDefaultDemo from "../demos/blocks/chartTooltipDefault.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipDefault()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipDefaultDemo" />

::: details Implementation notes
Full port. Shared building blocks (dataset, bar-chart option builder, HTML tooltip formatter, card scaffold, pin-open helper) live in src/shadcn/charts/chart-tooltip-shared.ts, reused by all 9 recipes in this family. Uses @domphy/chart's stacked bar chart + axis-trigger TooltipOption.formatter (verified against packages/chart/src/overlay/tooltip.ts as the ONLY tooltip customization hook the engine actually reads at runtime — backgroundColor/borderColor/padding/extraCssText/textStyle are declared on TooltipOption but unused, so the engine's own hardcoded rounded/bordered/shadowed panel chrome already matches the spec's visual description and only the inner row content needed building). Hover-highlight cursor suppressed via axisPointer:{type:'none'} (default) vs 'shadow' when showCursor is on. The 'pinned open on column 2 by default' demo behavior is approximated by dispatching real synthetic mousemove events at the exact column's pixel position, computed with the SAME public createOrdinalScale factory and grid margins the engine's own hit-test uses internally (packages/chart/src/coord/grid.ts) — a genuine simulated hover, not a fabricated tooltip DOM, since TooltipOption.alwaysShowContent/showContent are declared but unimplemented at runtime.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-default.ts [chartTooltipDefault]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
