---
title: "@domphy/blocks — chartRadialSimple"
description: "Card-shelled five-ring radial bar chart drawn as raw SVG (packages/blocks/src/shadcn/charts/chart-radial-shared.ts: renderRadialRingsChart), not routed through..."
---

# chartRadialSimple

<script setup lang="ts">
import ChartRadialSimpleDemo from "../demos/blocks/chartRadialSimple.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadialSimple()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadialSimpleDemo" />

::: details Implementation notes
Card-shelled five-ring radial bar chart drawn as raw SVG (packages/blocks/src/shadcn/charts/chart-radial-shared.ts: renderRadialRingsChart), not routed through @domphy/chart's chart()/GaugeRenderer — that engine's gauge renderer draws only one track+progress arc per series at a shared radius and its tooltip hit-testing explicitly skips type:'gauge' series (verified in packages/chart/src/engine.ts), so building the concentric multi-ring layout + hover tooltip there would mean adding engine features, out of scope for a blocks-only task. Instead each ring is a stroked &lt;path&gt; arc (flat caps, stroke-dasharray/dashoffset grow-in via ui's motion()) over a pale full-circle &lt;circle&gt; track; sweep = value/max*360 from the top, five-hue accent rotation (primary/secondary/success/warning/info). Hover tooltip is a custom absolutely-positioned HTML overlay (swatch + category name) that follows the cursor via mousemove on each arc, reusing ui's card/heading/paragraph/small/strong patches and the existing chart-area-shared.ts card-shell/trend-footer helpers (chartTrendFooter gained an optional showIcon flag, backward compatible). Sample dataset (5 channel categories) is original, not copied from upstream. tsc --noEmit clean; 2/2 tests pass.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radial)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radial-simple.ts [chartRadialSimple]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
