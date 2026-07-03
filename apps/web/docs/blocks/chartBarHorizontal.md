---
title: "@domphy/blocks — chartBarHorizontal"
description: "Same monthly dataset rotated into horizontal bars against a left category axis, hidden value axis."
---

# chartBarHorizontal

<script setup lang="ts">
import ChartBarHorizontalDemo from "../demos/blocks/chartBarHorizontal.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarHorizontal()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarHorizontalDemo" />

::: details Implementation notes
Same monthly dataset rotated into horizontal bars against a left category axis, hidden value axis. The engine's built-in axis-trigger tooltip resolves hover position by comparing mouse X against the X scale unconditionally (packages/chart/src/engine.ts bindTooltipEvents) — meaningless for horizontal bars where the category axis is Y — and there is no item-trigger hit-testing for bar series at all, so the native tooltip is disabled (`tooltip: {show:false}`) and replaced with a custom mouse-to-row overlay (chartBarHorizontalHoverOverlay in chart-bar-shared.ts) built with @domphy/chart's own exported scale factories (createOrdinalScale/createLinearScale) against an explicit fixed-pixel grid, so it lines up exactly with the real bars. Category (y) axes render bottom-to-top in this engine, so the data/category arrays are reversed before rendering to keep the on-screen top-to-bottom order chronological (Jan at top). Corner radius again capped at the engine's hardcoded 2px regardless of the requested [0,5,5,0] radius.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-horizontal.ts [chartBarHorizontal]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
