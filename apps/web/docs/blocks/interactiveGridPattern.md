---
title: "@domphy/blocks — interactiveGridPattern"
description: "Full reimplementation of the single-active-cell hover-tracking behavior: an SVG grid of <rect> cells, each square's DOM element captured via its own `_onMount`..."
---

# interactiveGridPattern

<script setup lang="ts">
import InteractiveGridPatternDemo from "../demos/blocks/interactiveGridPattern.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `interactiveGridPattern()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="InteractiveGridPatternDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `width` | `number` | Width of each grid square, in SVG user units. Defaults to `40`. |
| `height` | `number` | Height of each grid square, in SVG user units. Defaults to `40`. |
| `squares` | `[number, number]` | `[columns, rows]` grid dimensions. Defaults to `[30, 20]`. |
| `hoverColor` | `ThemeColor` | Theme color family for the single hovered/active square's highlight fill. Defaults to `"neutral"`. |
| `fadeInDuration` | `number` | Fade-in duration in ms when a square becomes active. Defaults to `150`. |
| `fadeOutDuration` | `number` | Fade-out duration in ms when a square stops being active. Defaults to `400`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the pattern. Defaults to a small demo panel. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full reimplementation of the single-active-cell hover-tracking behavior: an SVG grid of &lt;rect&gt; cells, each square's DOM element captured via its own `_onMount` into a closure-scoped array; the grid svg's `_onMount` attaches mousemove/mouseleave, maps pointer position through the viewBox scale factor to a column/row index, and imperatively swaps `fill`/`transitionDuration` on exactly the previous and next active &lt;rect&gt; (fast fade-in ~150ms, slower fade-out ~400ms, both prop-configurable) — mirrors the imperative-DOM-write convention already used by pointer() in this package, since this is a high-frequency pointer-tracking concern unsuited to reactive state. Highlight fill is computed once via `themeColor(node, 'shift-9', hoverColor)` (a live `var(--x-n)` reference, stays theme-reactive without re-invocation) rather than a hardcoded gray, so it's theme-aware per Domphy convention (spec's upstream default was a fixed gray). Base squares use `fill:'transparent'`/`stroke:'currentColor'` (near-invisible per spec) — no 'colorful' random-per-square variant implemented (out of scope; not requested as a separate export). Demo-wrapper deviation same as the other two SVG patterns above (self-sized panel; foreground content gets `pointerEvents:none` so mousemove still reaches the grid underneath it). Default squares=[30,20] at 40x40 cells is this port's own reasonable hero-covering default (spec left the exact count unspecified). doctor CLI: 0 diagnostics.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/interactive-grid-pattern)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/interactiveGridPattern.ts [interactiveGridPattern]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
