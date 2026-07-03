---
title: "@domphy/blocks — chartRadarIcons"
description: "Legend entries reuse the same chartLegendRow icon field (and chartTrendIcon glyph) already used by the trend footer across every chart family in this package,..."
---

# chartRadarIcons

<script setup lang="ts">
import ChartRadarIconsDemo from "../demos/blocks/chartRadarIcons.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarIcons()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarIconsDemo" />

::: details Implementation notes
Legend entries reuse the same chartLegendRow icon field (and chartTrendIcon glyph) already used by the trend footer across every chart family in this package, so the up/down arrows are original geometric glyphs, not a copied icon set. Desktop assigned the down arrow and Mobile the up arrow - an arbitrary but internally consistent choice, since the spec only describes 'one down, one up' without saying which series gets which.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-icons.ts [chartRadarIcons]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
