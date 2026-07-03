---
title: "@domphy/blocks — chartBarMixed"
description: "Horizontal single-series chart (five browser categories) where every bar gets its own accent color via per-item itemStyle.color (theme-token-derived hex..."
---

# chartBarMixed

<script setup lang="ts">
import ChartBarMixedDemo from "../demos/blocks/chartBarMixed.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartBarMixed()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartBarMixedDemo" />

::: details Implementation notes
Horizontal single-series chart (five browser categories) where every bar gets its own accent color via per-item itemStyle.color (theme-token-derived hex through familyHex/chartBarColorHex), axis labels doubling as the key (no separate legend), numeric axis fully hidden. Uses the same custom horizontal hover overlay as chartBarHorizontal (native tooltip disabled for the same X/Y-scale-mismatch reason documented in chart-bar-shared.ts), configured with `showCategoryTitle:true` so the tooltip shows both the category name and value. Data/category order reversed for the same bottom-to-top category-axis reason as the horizontal recipe.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-bar-mixed.ts [chartBarMixed]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
