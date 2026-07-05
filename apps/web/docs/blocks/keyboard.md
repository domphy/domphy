---
title: "@domphy/blocks — keyboard"
description: "Full Mac-style key layout (esc/F-row, number row, QWERTY/ASDF/ZXCV rows, fn/control/option/command + space + arrow cluster) driven by real document..."
---

# keyboard

<script setup lang="ts">
import KeyboardDemo from "../demos/blocks/keyboard.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `keyboard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="KeyboardDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `showPreview` | `boolean` | Shows the floating "last keys typed" strip above the board. Defaults to `true`. |
| `playSound` | `boolean` | Plays a click sound on every mapped keydown. Defaults to `false`. |
| `soundSrc` | `string` | Sample audio file to play instead of the built-in synthesized click. Only used when `playSound` is `true`. |
| `scale` | `number` | Uniform CSS `scale()` factor applied to the whole board. Defaults to `1`. |
| `responsiveScale` | `KeyboardShowcaseResponsiveScale` | Per-breakpoint scale overrides (min-width media queries), applied on top of `scale`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
Full Mac-style key layout (esc/F-row, number row, QWERTY/ASDF/ZXCV rows, fn/control/option/command + space + arrow cluster) driven by real document keydown/keyup, gated on/off by IntersectionObserver so it never hijacks typing off-screen. Floating preview strip and click sound both implemented. Two honest gaps, both platform limits rather than skipped work: (1) the on-screen 'fn' key never lights up because most OS/browser combinations intercept the physical Fn key in firmware and never dispatch a DOM keydown for it — documented inline. (2) the click sound has no bundled audio asset (none was provided/approved to add as a new dependency), so by default it synthesizes a short filtered-noise 'thock' via the Web Audio API; passing `soundSrc` swaps in a real sample.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/keyboard)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/keyboard.ts [keyboard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
