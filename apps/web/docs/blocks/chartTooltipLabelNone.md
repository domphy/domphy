---
title: "@domphy/blocks — chartTooltipLabelNone"
description: "Full port."
---

# chartTooltipLabelNone

<script setup lang="ts">
import ChartTooltipLabelNoneDemo from "../demos/blocks/chartTooltipLabelNone.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipLabelNone()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipLabelNoneDemo" />

::: details Implementation notes
Full port. Combines showLabel:false and indicator:'none' on the shared formatter to confirm the two visibility flags compose independently rather than being mutually exclusive, as called out in the family's research note.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-label-none.ts [chartTooltipLabelNone]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
