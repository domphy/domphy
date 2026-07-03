---
title: "@domphy/blocks — chartLineLabel"
description: "Always-on numeric labels use @domphy/chart's native LineSeriesOption.label (built-in support, no workaround needed) with extra top grid margin so the topmost..."
---

# chartLineLabel

<script setup lang="ts">
import ChartLineLabelDemo from "../demos/blocks/chartLineLabel.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineLabel()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineLabelDemo" />

::: details Implementation notes
Always-on numeric labels use @domphy/chart's native LineSeriesOption.label (built-in support, no workaround needed) with extra top grid margin so the topmost label isn't clipped. Hover-enlarging active dot reuses the same hoverDotOverlay technique as chartLineDots (see its notes re: per-point hover state not being a built-in engine feature, and the design-time-only overlay fill color).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-label.ts [chartLineLabel]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
