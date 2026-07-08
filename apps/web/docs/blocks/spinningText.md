---
title: "@domphy/blocks — spinningText"
description: "Fully declarative, matches the spec's domSketch/animation description directly: the input phrase is repeated with a separator until the ring reads full (~28..."
---

# spinningText

<script setup lang="ts">
import SpinningTextDemo from "../demos/blocks/spinningText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `spinningText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SpinningTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string \| string[]` | Text placed once around the ring. An array is joined into one string. Defaults to a short demo phrase. |
| `duration` | `number` | Seconds per full rotation. Defaults to 10. |
| `reverse` | `boolean` | Spins counter-clockwise instead of clockwise. Defaults to false. |
| `radius` | `number` | Radius of the circular path, in `ch` (character-width) units — font-relative, matching upstream. Defaults to 5. |
| `transition` | `SpinningTextTransition` | Escape hatch for the spin's own timing/easing. See . |
| `style` | `StyleObject` | Passthrough style merged onto the wrapper. |

::: details Implementation notes
Fully declarative, matches the spec's domSketch/animation description directly: the input phrase is repeated with a separator until the ring reads full (~28 chars), each character gets a precomputed `rotate(angle) translate(0, calc(radius * -1))` transform placing it at its point on the circle, and the whole character group carries a single continuous linear CSS @keyframes rotation (default 10s/revolution, reverse flag flips direction). No lifecycle/JS driving needed. No meaningful fidelity gaps versus the spec. Direct-source-diff fix (2026-07-05): Glyphs were anchored by their own top-left corner (no self-centering transform), so each letter sat roughly half its own box off the ring. Added transformOrigin:center + a centering translate so each glyph's own center sits exactly on the ring.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/spinning-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/spinningText.ts [spinningText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
