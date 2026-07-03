---
title: "@domphy/blocks — chartRadarLinesOnly"
description: "Both series render with fillOpacity 0 (stroke-only) and the grid's radial spoke lines are suppressed via gridShowSpokes: false, while the polygon rings stay."
---

# chartRadarLinesOnly

<script setup lang="ts">
import ChartRadarLinesOnlyDemo from "../demos/blocks/chartRadarLinesOnly.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarLinesOnly()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarLinesOnlyDemo" />

::: details Implementation notes
Both series render with fillOpacity 0 (stroke-only) and the grid's radial spoke lines are suppressed via gridShowSpokes: false, while the polygon rings stay. Uses a dedicated tighter/more-overlapping sample dataset (RADAR_MONTHLY_TIGHT_DATA in chart-radar-shared.ts) per the spec's own research note. Hover detection still works with zero fill because it's angle-based, not a fill hit-test.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-lines-only.ts [chartRadarLinesOnly]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
