---
title: "@domphy/blocks — chartAreaStackedExpand"
description: "@domphy/chart has no native percent/offset stacking mode (verified against engine.ts's accumStackedLines, which only sums raw values)."
---

# chartAreaStackedExpand

<script setup lang="ts">
import ChartAreaStackedExpandDemo from "../demos/blocks/chartAreaStackedExpand.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartAreaStackedExpand()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartAreaStackedExpandDemo" />

::: details Implementation notes
@domphy/chart has no native percent/offset stacking mode (verified against engine.ts's accumStackedLines, which only sums raw values). Approximated by pre-normalizing each point to its percentage share before handing data to the engine and locking yAxis to a fixed 0-100 domain, so the stack always fills the plot. Tooltip is wired via a custom valueLabel callback to show the true raw counts (looked up by dataIndex/seriesIndex) even though the plotted heights are normalized shares, per the spec's behavior note. This is a genuine functional gap in the underlying chart engine, not a stub — the visual and tooltip behavior both work as specified via this workaround. Also carries the same mount-reveal approximation caveat as chartAreaDefault.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/area)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-area-stacked-expand.ts [chartAreaStackedExpand]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
