---
title: "@domphy/blocks — chartAreaIcons"
description: "Same stacked two-series chart as chartAreaLegend, but each legend entry uses a hand-authored trend-arrow SVG pictogram instead of a flat swatch, and the footer..."
---

# chartAreaIcons

<script setup lang="ts">
import ChartAreaIconsDemo from "../demos/blocks/chartAreaIcons.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaIcons()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaIconsDemo" />

::: details Implementation notes
Same stacked two-series chart as chartAreaLegend, but each legend entry uses a hand-authored trend-arrow SVG pictogram instead of a flat swatch, and the footer pairs its sentence with an icon (shared chartTrendFooter behavior). Icon choice is fully caller-configurable per the spec's research note (default demo pairs 'down' with one series and 'up' with the other purely to demonstrate the capability). Same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-icons.ts [chartAreaIcons]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
