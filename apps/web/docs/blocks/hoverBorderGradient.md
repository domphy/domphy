---
title: "@domphy/blocks — hoverBorderGradient"
description: "Perimeter-traveling glow implemented via a requestAnimationFrame loop writing --hbg-x/--hbg-y CSS custom properties (never a conic-gradient spin), consumed by..."
---

# hoverBorderGradient

<script setup lang="ts">
import HoverBorderGradientDemo from "../demos/blocks/hoverBorderGradient.ts?raw"
</script>

A **Buttons** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `hoverBorderGradient()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="HoverBorderGradientDemo" />

::: details Implementation notes
Perimeter-traveling glow implemented via a requestAnimationFrame loop writing --hbg-x/--hbg-y CSS custom properties (never a conic-gradient spin), consumed by a blurred radial-gradient layer; clockwise/counterclockwise and duration are both honored; hover intensifies the glow/darkens the content face via CSS-only nested selectors. Polymorphic `as: 'button'|'div'|'a'` supported by branching the returned element shape. Simplification: the domSketch's 3 layers (content / solid mask / blurred blob) are collapsed into 2 -- the content layer doubles as the mask (its own inset + solid background is what hides the blob's center) -- which is visually equivalent to the 3-layer description. Added an optional `color` prop beyond the upstream API, which the spec's own researchNote flags as a reasonable clean-room addition since no color-customization prop exists upstream. Verified: tsc clean, doctor 0 diagnostics, all tests pass.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/hover-border-gradient)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/buttons/hoverBorderGradient.ts [hoverBorderGradient]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
