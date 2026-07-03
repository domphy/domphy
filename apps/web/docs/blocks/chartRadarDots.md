---
title: "@domphy/blocks — chartRadarDots"
description: "Same SVG-based implementation and animation approximation as chartRadarDefault; dots are grouped in the same <g> as the polygon so they inherit its scale-in..."
---

# chartRadarDots

<script setup lang="ts">
import ChartRadarDotsDemo from "../demos/blocks/chartRadarDots.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarDots()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarDotsDemo" />

::: details Implementation notes
Same SVG-based implementation and animation approximation as chartRadarDefault; dots are grouped in the same &lt;g&gt; as the polygon so they inherit its scale-in reveal together, matching the spec's 'no separate dot animation' behavior.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-dots.ts [chartRadarDots]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
