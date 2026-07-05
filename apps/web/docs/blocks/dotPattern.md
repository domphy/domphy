---
title: "@domphy/blocks — dotPattern"
description: "Deliberately does NOT reuse gridPattern's zero-JS <pattern>-tiling technique: `glow` mode needs each visible dot to animate on its own independently randomized..."
---

# dotPattern

<script setup lang="ts">
import DotPatternDemo from "../demos/blocks/dotPattern.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `dotPattern()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DotPatternDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `width` | `number` | Horizontal spacing between dots, in px. Defaults to `16`. |
| `height` | `number` | Vertical spacing between dots, in px. Defaults to `16`. |
| `x` | `number` | Whole-pattern horizontal offset, in px. Defaults to `0`. |
| `y` | `number` | Whole-pattern vertical offset, in px. Defaults to `0`. |
| `cx` | `number` | Per-dot horizontal center offset within its cell, in px. Defaults to `1`. |
| `cy` | `number` | Per-dot vertical center offset within its cell, in px. Defaults to `1`. |
| `cr` | `number` | Dot radius, in px. Defaults to `1`. |
| `glow` | `boolean` | Turns on the animated glow (randomized per-dot pulse). Defaults to `false`. |
| `color` | `ThemeColor` | Theme color family for the dots/glow core. Defaults to `"neutral"`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the dot field. Defaults to a small demo heading. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Deliberately does NOT reuse gridPattern's zero-JS &lt;pattern&gt;-tiling technique: `glow` mode needs each visible dot to animate on its own independently randomized duration/delay, and a single &lt;pattern&gt; tile stamps identical content at every repeat, so no tile can carry per-instance randomness. Instead the dot grid is individual &lt;circle&gt; elements, managed imperatively -- on mount and on every ResizeObserver firing, the container is measured, the previous circle set is cleared, and a fresh grid (columns/rows = measured size / spacing) is appended via document.createElementNS, matching the spec's own research note ('recalculated from the container's measured pixel size divided by spacing'). This runs from the &lt;g&gt; layer's own _onMount (node.domElement is that &lt;g&gt; directly, already appended under its parent &lt;svg&gt; by the time Mount fires) rather than an ancestor querying for it, sidestepping the same Mount-fires-before-children ordering issue documented in animatedGridPattern. Non-glow dots are plain fill='currentColor' (color set once on the &lt;svg&gt; root); glow dots read from a shared &lt;radialGradient&gt; (bright core -&gt; transparent) and each get randomized animation-duration (1.6-3.0s) / animation-delay (0-3s) on one shared scale+opacity 'there and back' @keyframes, so no two dots twinkle in sync. jsdom/non-layout runtimes (0x0 getBoundingClientRect) fall back to a fixed 320x200 default grid, exercised by this file's test. Direct-source-diff fix (2026-07-05): Glow pulse amplitude/timing diverged from upstream (scale 0.85-1.25/opacity 0.6-1/1.6-3s vs upstream's scale 1-1.5/opacity 0.4-1/2-5s). Aligned the keyframe ranges.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/dot-pattern)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/dotPattern.ts [dotPattern]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
