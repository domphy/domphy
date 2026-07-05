---
title: "@domphy/blocks — lampEffect"
description: "Each cone half is built from clip-path: polygon(...) (a triangle rotated outward from vertical, mirrored left/right) filled with a plain linear-gradient(to..."
---

# lampEffect

<script setup lang="ts">
import LampEffectDemo from "../demos/blocks/lampEffect.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `lampEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LampEffectDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[]` | Heading/content shown tucked under the light source. Defaults to a small demo heading. |
| `glowColor` | `ThemeColor` | Theme color family for the cone/glow. Defaults to `"info"` (cyan/blue). |
| `style` | `StyleObject` | — |

::: details Implementation notes
Each cone half is built from clip-path: polygon(...) (a triangle rotated outward from vertical, mirrored left/right) filled with a plain linear-gradient(to bottom, bright, transparent), rather than a literal CSS conic-gradient() as the research note describes - a deliberate substitution for simpler, more predictable 'twin wedge fanning from a point' geometry; visually it reads as the same twin-cone light shape. A mask-image linear-gradient fades the whole cone's bottom edge into the section background as specified. All light-emitting pieces (both cone halves, the bright bar, two glow blobs at 8rem/16rem and 15rem/30rem per the research note) play a one-time motion()-driven width/opacity entrance, staggered by small per-element delays, over ~0.8s ease-in-out, matching the spec's timing.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/lamp-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/lampEffect.ts [lampEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
