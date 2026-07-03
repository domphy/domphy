---
title: "@domphy/blocks — gridPattern"
description: "Fully static, zero-JS implementation matching the spec's own description ('no animation of its own'): a single SVG <pattern> (patternUnits=userSpaceOnUse)..."
---

# gridPattern

<script setup lang="ts">
import GridPatternDemo from "../demos/blocks/gridPattern.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `gridPattern()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GridPatternDemo" />

::: details Implementation notes
Fully static, zero-JS implementation matching the spec's own description ('no animation of its own'): a single SVG &lt;pattern&gt; (patternUnits=userSpaceOnUse) tiled across a background &lt;rect&gt; draws the line grid natively, so it reflows on resize with no ResizeObserver needed at all. `squares` renders as solid &lt;rect&gt; highlights layered on top, keyed by `${column}-${row}`. External edge-fade masks / skew transforms remain the caller's responsibility exactly as upstream documents (exposed via the returned demo wrapper's `style` passthrough). This is the static sibling animatedGridPattern's line-grid layer is copied from (both use the same &lt;pattern&gt; technique).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/grid-pattern)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/gridPattern.ts [gridPattern]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
