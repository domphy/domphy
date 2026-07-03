---
title: "@domphy/blocks — chartBarLabel"
description: "Uses @domphy/chart's native bar `label` option (show:true, position:'top', formatter) — this is genuinely engine-supported..."
---

# chartBarLabel

<script setup lang="ts">
import ChartBarLabelDemo from "../demos/blocks/chartBarLabel.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarLabel()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarLabelDemo" />

::: details Implementation notes
Uses @domphy/chart's native bar `label` option (show:true, position:'top', formatter) — this is genuinely engine-supported (packages/chart/src/overlay/labels.ts renderBarLabels), so value labels are real, not an overlay hack. Y-axis fully hidden, vertical split lines only, x-axis month labels with no ticks. Label text color/font-size are the engine's own fixed defaults (renderBarLabels hardcodes the label color and only reads fontSize, not a custom color, from LabelOption) — close enough to the spec's 'foreground-colored ~12px text' that no override was needed.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-label.ts [chartBarLabel]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
