---
title: "@domphy/blocks — pointerHighlight"
description: "Full behavior implemented: an IntersectionObserver (guarded for non-browser runtimes) flips a State<boolean> once the wrapped phrase scrolls into view..."
---

# pointerHighlight

<script setup lang="ts">
import PointerHighlightDemo from "../demos/blocks/pointerHighlight.ts?raw"
</script>

A **Effects 3D** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `pointerHighlight()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="PointerHighlightDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| string` | The highlighted phrase itself. Defaults to a short demo phrase. |
| `leadingText` | `string` | Plain text rendered before the highlighted phrase. Defaults to `"Scroll down to see "`. |
| `trailingText` | `string` | Plain text rendered after the highlighted phrase. Defaults to `" get highlighted."`. |
| `color` | `ThemeColor` | Theme color family for the rectangle stroke and pointer fill. Defaults to `"info"`. |
| `padding` | `number` | Padding between the text and the rectangle outline, in `themeSpacing` units. Defaults to `1.5`. |
| `cornerRadius` | `number` | Rectangle corner radius, in px (an SVG geometry attribute, not a CSS style value). Defaults to `8`. |
| `pointerCorner` | `PointerHighlightCorner` | Which corner of the rectangle the pointer glyph anchors near. Defaults to `"bottom-right"`. |
| `once` | `boolean` | Plays once and never replays on later scroll-outs/scroll-ins when `true` (default). `false` re-plays (and reverses) every time visibility toggles. |
| `duration` | `number` | Milliseconds the rectangle's draw-in animation takes. Defaults to `600`. |
| `pointerStagger` | `number` | Extra milliseconds the pointer glyph waits after the rectangle starts drawing. Defaults to `350`. |
| `viewMargin` | `string` | `IntersectionObserver` `rootMargin`. Defaults to `"-80px"` (fires slightly before fully visible). |
| `containerClassName` | `string` | Extra class name merged onto the outer wrapper's native `class` attribute. |
| `rectangleClassName` | `string` | Extra class name merged onto the rectangle overlay's native `class` attribute. |
| `pointerClassName` | `string` | Extra class name merged onto the pointer glyph's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper `&lt;p&gt;`. |

::: details Implementation notes
Full behavior implemented: an IntersectionObserver (guarded for non-browser runtimes) flips a State&lt;boolean&gt; once the wrapped phrase scrolls into view (rootMargin configurable), driving a one-shot (or repeatable via once=false) reveal. The rectangle 'draws itself' via the pathLength=100 + stroke-dasharray/dashoffset SVG line-draw trick (same technique this package's own borderBeam.ts/shineBorder.ts use for their orbiting comets) rather than a plain fade, so it visually reads as an outline being traced. The pointer glyph is a small hand-authored solid-fill SVG cursor arrow, staggered in after the rectangle via transition.delay. Both are driven by motion() (Web Animations API), matching blurFade.ts's 'toState + motion(), flipped once by an observer' idiom. Found and fixed a real core gap while building this: `pathLength` was missing from packages/core/src/constants/CamelAttributes.ts, so it was being kebab-cased to the invalid `path-length` attribute instead of staying `pathLength` — fixed at the source (additive-only), same precedent as squigglyText.ts's SvgTags.ts fix.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/pointer-highlight)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/effects-3d/pointerHighlight.ts [pointerHighlight]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
