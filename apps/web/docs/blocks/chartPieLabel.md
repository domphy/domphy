---
title: "@domphy/blocks — chartPieLabel"
description: "Adds outside category-name labels with thin leader lines (own trigonometry-based placement, hidden below a minLabelFraction to avoid crowding) and suppresses..."
---

# chartPieLabel

<script setup lang="ts">
import ChartPieLabelDemo from "../demos/blocks/chartPieLabel.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieLabel()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieLabelDemo" />

::: details Implementation notes
Adds outside category-name labels with thin leader lines (own trigonometry-based placement, hidden below a minLabelFraction to avoid crowding) and suppresses the duplicate name in the tooltip (showName:false, value-only). Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-label.ts [chartPieLabel]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
