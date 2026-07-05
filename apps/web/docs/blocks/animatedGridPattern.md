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

## Props

| Prop | Type | Description |
|---|---|---|
| `width` | `number` | Grid cell width, in px. Defaults to `40`. |
| `height` | `number` | Grid cell height, in px. Defaults to `40`. |
| `x` | `number` | Pattern horizontal offset, in px. Defaults to `-1`. |
| `y` | `number` | Pattern vertical offset, in px. Defaults to `-1`. |
| `strokeDasharray` | `string` | Solid vs dashed line style, e.g. `"4 2"`. Defaults to solid (`undefined`). |
| `numSquares` | `number` | How many animated cells to show at once. Defaults to `50`. |
| `maxOpacity` | `number` | Peak fade-in opacity for an animated square. Defaults to `0.5`. |
| `duration` | `number` | Full fade-in + fade-out duration, in seconds. Defaults to `4`. |
| `repeatDelay` | `number` | Pause, in seconds, once a square fades back to `0` before it re-rolls position and fades in again. Defaults to `0.5`. |
| `color` | `ThemeColor` | Theme color family for the lines and animated squares. Defaults to `"neutral"`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Static line grid (same &lt;pattern&gt; technique as gridPattern) overlaid with `numSquares` &lt;rect&gt; cells, each driven by one shared CSS @keyframes (opacity 0-&gt;maxOpacity-&gt;0, mapped from `duration`+`repeatDelay` into keyframe percentages) with a per-index animation-delay spread evenly across one full cycle so the population is continuously staggered rather than pulsing in lockstep -- a closer read of 'never pulses in sync' than a merely 'small' per-index delay. Re-rolling a square's grid cell on every completed cycle (which pure CSS state cannot do) is driven by the native `animationiteration` DOM event, which fires exactly at the loop boundary (both keyframe ends sit at opacity 0, so the reposition is invisible) -- no JS timer needed. One correctness note worth flagging: Domphy's Mount hook fires top-down, BEFORE a node's own children are appended into the DOM (verified by reading ElementNode.render's recursion order), so an ancestor's _onMount cannot synchronously querySelector its own not-yet-rendered descendants. The ResizeObserver is therefore attached from the nested squares-layer &lt;svg&gt;'s own _onMount and relies only on the observer's own always-asynchronous first callback (never a synchronous initial call) to snap squares onto the measured grid -- this is documented inline and confirmed correct by a live doctor + Vitest pass on this exact tree shape.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-grid-pattern)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/animatedGridPattern.ts [animatedGridPattern]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
