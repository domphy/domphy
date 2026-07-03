---
title: "@domphy/blocks — chartRadarGridCircleFill"
description: "Circular grid rings plus a tinted circle fill layer (0.2 opacity) and series fillOpacity reduced to 0.5, same subtlety pattern as chartRadarGridFill but round;..."
---

# chartRadarGridCircleFill

<script setup lang="ts">
import ChartRadarGridCircleFillDemo from "../demos/blocks/chartRadarGridCircleFill.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarGridCircleFill()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarGridCircleFillDemo" />

::: details Implementation notes
Circular grid rings plus a tinted circle fill layer (0.2 opacity) and series fillOpacity reduced to 0.5, same subtlety pattern as chartRadarGridFill but round; keeps the standard labeled (category heading + swatch) tooltip, the one grid-family recipe that does per spec.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-grid-circle-fill.ts [chartRadarGridCircleFill]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
