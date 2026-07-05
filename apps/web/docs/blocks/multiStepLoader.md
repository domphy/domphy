---
title: "@domphy/blocks — multiStepLoader"
description: "Full-viewport frosted overlay, always mounted, toggled via reactive opacity/visibility/pointerEvents off a `loading` ValueOrState; `toState()` returns the..."
---

# multiStepLoader

<script setup lang="ts">
import MultiStepLoaderDemo from "../demos/blocks/multiStepLoader.ts?raw"
</script>

A **Loaders** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `multiStepLoader()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="MultiStepLoaderDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `loadingStates` | `MultiStepLoaderStep[]` | Ordered steps walked through. Defaults to an 8-step placeholder sequence. |
| `loading` | `ValueOrState&lt;boolean&gt;` | Controls whether the overlay is mounted/visible. Accepts a value or reactive state. Defaults to `false`. |
| `duration` | `number` | Milliseconds between automatic step advances. Defaults to `2000`. |
| `loop` | `boolean` | Restart from the first step after the last one. Defaults to `true`. |
| `value` | `ValueOrState&lt;number&gt;` | Manually controls the active step index, overriding the internal auto-advance timer, when provided. |
| `onClose` | `() =&gt; void` | Called when the built-in close button is pressed (in addition to setting `loading` to `false`). |

::: details Implementation notes
Full-viewport frosted overlay, always mounted, toggled via reactive opacity/visibility/pointerEvents off a `loading` ValueOrState; `toState()` returns the caller's own State reference when one is passed, so the built-in close button's `.set(false)` is directly observable by a caller-owned state (an `onClose` callback is also offered for plain-boolean callers). Auto-advance uses `watch()` on the loading state to start/stop a setInterval (loop/duration honored, stops on last step when loop=false); an optional `value` prop allows fully manual index control, bypassing the internal timer. Step rows recompute icon/text color/opacity from distance-to-active-index; the column translateY reactively scroll-anchors the current step. Simplification: 'filled vs outline' checkmark icons are distinguished via stroke-width/color/opacity rather than a second hardcoded punch-through fill color (avoids introducing any literal color), and the backdrop/step palette is a single reactive (ambient-tone-following) scheme rather than a separate hardcoded light/dark backdrop variant -- both are documented, deliberate simplifications, not missing functionality. Verified: tsc clean, doctor 0 diagnostics, all tests pass (including fake-timer auto-advance and manual-value-skips-timer cases). A self-contained `Click to load` trigger button is rendered alongside the (always-mounted) overlay, flipping `loading` to `true` on click — without it the zero-arg demo had no way to ever become visible (the overlay alone starts fully hidden/inert).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/multi-step-loader)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/loaders/multiStepLoader.ts [multiStepLoader]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
