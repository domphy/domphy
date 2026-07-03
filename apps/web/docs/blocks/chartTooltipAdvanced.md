---
title: "@domphy/blocks — chartTooltipAdvanced"
description: "Square swatch, hidden header, monospace+unit value rendering, and the conditional divider + bold Total row on the configured column index are all fully ported."
---

# chartTooltipAdvanced

<script setup lang="ts">
import ChartTooltipAdvancedDemo from "../demos/blocks/chartTooltipAdvanced.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartTooltipAdvanced()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartTooltipAdvancedDemo" />

::: details Implementation notes
Square swatch, hidden header, monospace+unit value rendering, and the conditional divider + bold Total row on the configured column index are all fully ported. The one unmet part of the spec is 'a fixed pixel width for the panel': @domphy/chart's tooltip container hardcodes its own box model (border/radius/shadow/background/max-width:260px) inside createTooltip(), and TooltipOption exposes no width field the runtime actually reads (verified in packages/chart/src/overlay/tooltip.ts — only option.show/formatter/valueFormatter are consumed). Approximated with a min-width wrapper div inside the formatter's own returned HTML, which reserves the requested width visually (the outer panel uses white-space:nowrap with no overflow:hidden, so wider content overflows the box rather than wrapping) but cannot truly widen the outer panel past the engine's hardcoded max-width — a real, source-verified engine limitation, not a guess.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/tooltip)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-tooltip-advanced.ts [chartTooltipAdvanced]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
