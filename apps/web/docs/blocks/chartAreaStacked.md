---
title: "@domphy/blocks — chartAreaStacked"
description: "Two flat-fill series sharing a stack id; engine's own accumStackedLines() computes the cumulative baseline, and the axis tooltip correctly shows each series'..."
---

# chartAreaStacked

<script setup lang="ts">
import ChartAreaStackedDemo from "../demos/blocks/chartAreaStacked.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaStacked()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaStackedDemo" />

::: details Implementation notes
Two flat-fill series sharing a stack id; engine's own accumStackedLines() computes the cumulative baseline, and the axis tooltip correctly shows each series' individual (non-cumulative) value since the engine's tooltip hit-test reads the raw pre-stack series data. VISUAL QA FIX (2026-07-04): a genuine @domphy/chart engine bug made every stacked area recipe render as a solid flat rectangle instead of a layered mountain — LineRenderer always drew each series' area fill from the value-axis zero line instead of the previous stacked series' cumulative curve (gl/LineRenderer.ts), and the y-axis auto-extent (coord/grid.ts's dataExtentFromSeries) sized itself from each series' own raw values instead of the cumulative stacked total, so the topmost layer overflowed off-canvas. Both fixed at the engine layer (LineRenderer now takes a per-series stacked baseline from accumStackedLines; dataExtentFromSeries accumulates stacked series before computing extent) — no recipe-level change needed. Same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-stacked.ts [chartAreaStacked]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
