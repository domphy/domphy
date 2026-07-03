---
title: "@domphy/blocks — chartRadarLabelCustom"
description: "Two-line tick label built from two stacked SVG text elements (bold value/value line using two tspan sub-spans for the two-tone styling, then a muted month-name..."
---

# chartRadarLabelCustom

<script setup lang="ts">
import ChartRadarLabelCustomDemo from "../demos/blocks/chartRadarLabelCustom.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarLabelCustom()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarLabelCustomDemo" />

::: details Implementation notes
Two-line tick label built from two stacked SVG text elements (bold value/value line using two tspan sub-spans for the two-tone styling, then a muted month-name line below it), per the spec's own domSketch. Plot radius is trimmed slightly and the topmost label pushed further out to leave room for the taller label, matching the spec's 'larger margins' note without claiming an exact upstream pixel match.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-label-custom.ts [chartRadarLabelCustom]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
