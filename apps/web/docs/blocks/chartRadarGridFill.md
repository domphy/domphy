---
title: "@domphy/blocks — chartRadarGridFill"
description: "Grid's outer polygon rendered as a second, low-opacity (0.2) filled layer beneath the ring/spoke lines, same accent hue as the series; series fillOpacity..."
---

# chartRadarGridFill

<script setup lang="ts">
import ChartRadarGridFillDemo from "../demos/blocks/chartRadarGridFill.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarGridFill()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarGridFillDemo" />

::: details Implementation notes
Grid's outer polygon rendered as a second, low-opacity (0.2) filled layer beneath the ring/spoke lines, same accent hue as the series; series fillOpacity reduced to 0.5 so the tint stays visible through it, per spec's exact opacity figures.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-grid-fill.ts [chartRadarGridFill]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
