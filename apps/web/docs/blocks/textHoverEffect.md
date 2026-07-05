---
title: "@domphy/blocks — textHoverEffect"
description: "Full literal port of the domSketch: a viewBox-sized, responsively-scaled SVG with two stacked <text> copies at the same position — a permanent outline-only..."
---

# textHoverEffect

<script setup lang="ts">
import TextHoverEffectDemo from "../demos/blocks/textHoverEffect.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `textHoverEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TextHoverEffectDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `text` | `string` | The string rendered as the big outlined heading. Defaults to `"Domphy"`. |
| `duration` | `number` | Seconds controlling how much the reveal's position/opacity transition is eased — `0` snaps instantly to the pointer, larger values add a smooth lag/fade. Defaults to `0`. |
| `colors` | `ThemeColor[]` | Gradient color stops, warm-to-cool, used to fill the pointer-revealed text. Defaults to `["danger", "warning", "info", "secondary"]`. |
| `strokeColor` | `ThemeColor` | Theme color family for the resting outline stroke. Defaults to `"neutral"`. |
| `className` | `string` | Extra class name merged onto the outer container's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Full literal port of the domSketch: a viewBox-sized, responsively-scaled SVG with two stacked &lt;text&gt; copies at the same position — a permanent outline-only stencil copy (fill=none, subtle themed stroke) and a gradient-filled copy visible only through an SVG &lt;mask&gt; whose circle tracks the pointer (feGaussianBlur'd for a soft edge). Pointer position is written imperatively to the mask circle's cx/cy on every pointermove (zero-lag, matching this package's own svgMaskEffect.ts tradeoff), with the position/opacity change eased via a plain CSS transition sized by the `duration` prop (0 = instant snap, matching the documented default). Text fontSize is sized proportionally to string length (no DOM measurement pass needed), keeping the resting render fully SSR-safe. FOUND AND FIXED A REAL BUG during implementation: initially queried the mask circle by ID from the outer container's own _onMount, which failed because a parent's _onMount fires before its subtree has finished attaching (confirmed by instrumented debug run) — refactored to the ref-capture pattern (circle captures its own DOM ref in its own _onMount; the outer pointermove handler reads that ref lazily at event time), matching the idiom this package's backgroundBeams.ts/kineticText.ts already use. Doctor-clean (0 diagnostics) and 3/3 tests pass, including a pointermove/pointerleave interaction test that asserts the reveal circle's opacity actually flips.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/text-hover-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/textHoverEffect.ts [textHoverEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
