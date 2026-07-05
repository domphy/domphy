---
title: "@domphy/blocks — pathMorph"
description: "Both glyphs hand-authored as two 4-point polygons with a fixed index correspondence (left bar's right edge collapses into the triangle apex; right bar's 4..."
---

# pathMorph

<script setup lang="ts">
import PathMorphDemo from "../demos/blocks/pathMorph.ts?raw"
</script>

A **Labs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `pathMorph()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="PathMorphDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `playing` | `ValueOrState&lt;boolean&gt;` | Playing/paused value. Pass a `State&lt;boolean&gt;` for controlled external control (the click handler still toggles it); a plain boolean seeds an internal, uncontrolled state. Defaults to `true` (renders the two-bar "pause" glyph at rest, matching the reference demo). |
| `onToggle` | `(playing: boolean) =&gt; void` | — |
| `sizeUnits` | `number` | Button side length, in `themeSpacing` units. Defaults to `11` (~44px at the base font size). |
| `color` | `ThemeColor` | Color family for the button's dark track and its light glyph. Defaults to `"neutral"`. |
| `duration` | `number` | Morph duration, in ms. Defaults to `240` — "well under half a second". |
| `ariaLabel` | `{ play: string; pause: string }` | — |
| `style` | `StyleObject` | — |

::: details Implementation notes
Both glyphs hand-authored as two 4-point polygons with a fixed index correspondence (left bar's right edge collapses into the triangle apex; right bar's 4 points all converge on that same apex), morphed via a manual requestAnimationFrame point-lerp (ease-out cubic, no overshoot to avoid mid-morph self-intersection) rather than relying on WAAPI's `d` animation, whose cross-engine support is inconsistent and which jsdom's Element.animate() no-ops entirely. Exact upstream point geometry was never viewed (clean-room), so the glyph silhouettes are an independent approximation of 'rounded/skewed pause bars' and 'play triangle', not a pixel match.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/labs/svg-path-morphing)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/labs/pathMorph.ts [pathMorph]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
