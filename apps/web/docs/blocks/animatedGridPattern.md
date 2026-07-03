---
title: "@domphy/blocks — animatedGridPattern"
description: "Static line grid (same <pattern> technique as gridPattern) overlaid with `numSquares` <rect> cells, each driven by one shared CSS @keyframes (opacity..."
---

# animatedGridPattern

<script setup lang="ts">
import AnimatedGridPatternDemo from "../demos/blocks/animatedGridPattern.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedGridPattern()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedGridPatternDemo" />

::: details Implementation notes
Static line grid (same &lt;pattern&gt; technique as gridPattern) overlaid with `numSquares` &lt;rect&gt; cells, each driven by one shared CSS @keyframes (opacity 0-&gt;maxOpacity-&gt;0, mapped from `duration`+`repeatDelay` into keyframe percentages) with a per-index animation-delay spread evenly across one full cycle so the population is continuously staggered rather than pulsing in lockstep -- a closer read of 'never pulses in sync' than a merely 'small' per-index delay. Re-rolling a square's grid cell on every completed cycle (which pure CSS state cannot do) is driven by the native `animationiteration` DOM event, which fires exactly at the loop boundary (both keyframe ends sit at opacity 0, so the reposition is invisible) -- no JS timer needed. One correctness note worth flagging: Domphy's Mount hook fires top-down, BEFORE a node's own children are appended into the DOM (verified by reading ElementNode.render's recursion order), so an ancestor's _onMount cannot synchronously querySelector its own not-yet-rendered descendants. The ResizeObserver is therefore attached from the nested squares-layer &lt;svg&gt;'s own _onMount and relies only on the observer's own always-asynchronous first callback (never a synchronous initial call) to snap squares onto the measured grid -- this is documented inline and confirmed correct by a live doctor + Vitest pass on this exact tree shape.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-grid-pattern)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/animatedGridPattern.ts [animatedGridPattern]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
