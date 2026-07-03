---
title: "@domphy/blocks — chartLineInteractive"
description: "Fully genuine implementation, no overlay hacks needed: ~90 daily points, auto-thinning x-axis labels (engine's built-in ordinal label-collision skipping) with..."
---

# chartLineInteractive

<script setup lang="ts">
import ChartLineInteractiveDemo from "../demos/blocks/chartLineInteractive.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineInteractive()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineInteractiveDemo" />

::: details Implementation notes
Fully genuine implementation, no overlay hacks needed: ~90 daily points, auto-thinning x-axis labels (engine's built-in ordinal label-collision skipping) with a short-date axisLabel.formatter, vertical cursor guide kept (axisPointer type:'line', the one recipe that does NOT suppress it), full-date + 'Views: N' tooltip formatter looked up by dataIndex. Header stat tiles double as a series switcher: clicking sets a reactive dataActive attribute (CSS `&[data-active=true]` tint, matching the codebase's existing segmented()-patch convention) and swaps the plotted series by mutating a plain State&lt;ChartOption&gt; (not computed()) — discovered during implementation that @domphy/chart's chart() patch subscribes via `.addListener`, which a real State exposes but a Computed does not (a latent bug in @domphy/chart's patch.ts outside this package's scope), so a plain State + manual rebuild-on-click was used instead of the more idiomatic computed() derivation. Tile-switch re-triggers the same clip-path sweep animation manually via a captured DOM ref (WAAPI), approximating 'the newly active line redraws with the same left-to-right draw-in' per the spec, for the same underlying reason described in chartLineDefault's notes (no SVG path to stroke-animate).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-interactive.ts [chartLineInteractive]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
