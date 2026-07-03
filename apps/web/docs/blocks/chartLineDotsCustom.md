---
title: "@domphy/blocks — chartLineDotsCustom"
description: "Custom per-point icon markers aren't reachable through ChartOption (SymbolType accepts 'pin'/'diamond'/etc in the type surface, but the actual line-symbol..."
---

# chartLineDotsCustom

<script setup lang="ts">
import ChartLineDotsCustomDemo from "../demos/blocks/chartLineDotsCustom.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartLineDotsCustom()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartLineDotsCustomDemo" />

::: details Implementation notes
Custom per-point icon markers aren't reachable through ChartOption (SymbolType accepts 'pin'/'diamond'/etc in the type surface, but the actual line-symbol renderer always draws a plain circle regardless of the requested symbol). Implemented the same way as chartLineDotsColors: native symbols disabled, a companion SVG overlay draws a small hollow rounded-bar 'pin' glyph (original hand-drawn artwork, outline = series color, fill = card background) at each point via the shared staticPointMarkersOverlay + public scale factories.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/line)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-line-dots-custom.ts [chartLineDotsCustom]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
