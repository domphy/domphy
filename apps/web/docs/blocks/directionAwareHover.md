---
title: "@domphy/blocks — directionAwareHover"
description: "Full behavior match including the diagonal-slicing entry classification (comparing the pointer-enter point against the rectangle's two diagonals, not simple..."
---

# directionAwareHover

<script setup lang="ts">
import DirectionAwareHoverDemo from "../demos/blocks/directionAwareHover.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `directionAwareHover()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DirectionAwareHoverDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `imageSrc` | `string` | Background image source. Defaults to a generic inline placeholder photo. |
| `imageAlt` | `string` | — |
| `children` | `DomphyElement[]` | Overlay content (title + subtitle, typically). Defaults to a generic demo caption. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full behavior match including the diagonal-slicing entry classification (comparing the pointer-enter point against the rectangle's two diagonals, not simple quadrant math, so corner entries resolve to a sensible nearest edge -- see classifyEntryDirection's derivation in the file header comment). Image pans/scales opposite the entry edge and the overlay panel slides in from that same edge on enter, reversing on leave; both driven by direct inline-transform writes with static CSS transitions, plus a snap-without-transition + forced-reflow step so re-entering from a different edge doesn't visibly slide across the old edge first.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/direction-aware-hover)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/directionAwareHover.ts [directionAwareHover]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
