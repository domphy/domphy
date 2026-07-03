---
title: "@domphy/blocks — chartPieDonutText"
description: "Two stacked SVG <text> elements (bold total + muted caption, configurable totalGetter/caption) are anchored at the pie's own center coordinate with..."
---

# chartPieDonutText

<script setup lang="ts">
import ChartPieDonutTextDemo from "../demos/blocks/chartPieDonutText.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieDonutText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieDonutTextDemo" />

::: details Implementation notes
Two stacked SVG &lt;text&gt; elements (bold total + muted caption, configurable totalGetter/caption) are anchored at the pie's own center coordinate with text-anchor/dominant-baseline centering, per the spec's guidance to keep this responsive to SVG resizing rather than an absolutely-positioned HTML overlay. Total stays static regardless of hover, as specified. Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-donut-text.ts [chartPieDonutText]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
