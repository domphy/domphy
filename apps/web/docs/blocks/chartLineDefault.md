---
title: "@domphy/blocks — chartLineDefault"
description: "All spec behavior implemented via @domphy/chart's chart() patch: smooth single-series line, hidden y-axis with horizontal-only splitlines, no-axis-line/no-tick..."
---

# chartLineDefault

<script setup lang="ts">
import ChartLineDefaultDemo from "../demos/blocks/chartLineDefault.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineDefault()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineDefaultDemo" />

::: details Implementation notes
All spec behavior implemented via @domphy/chart's chart() patch: smooth single-series line, hidden y-axis with horizontal-only splitlines, no-axis-line/no-tick month x-axis, value-only hover tooltip with cursor highlight suppressed (axisPointer type 'none'), trend footer with up/down arrow icon. One approximation: the 'line draws in left-to-right' mount animation is done as a clip-path sweep over the WHOLE plot box (grid+axis+line together) via the shared chartMountReveal() helper, not an isolated SVG stroke-dasharray draw-in on just the line — @domphy/chart renders lines through a WebGL canvas with no SVG &lt;path&gt; element to animate that way.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-default.ts [chartLineDefault]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
