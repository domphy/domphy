---
title: "@domphy/blocks — svgMaskEffect"
description: "Implemented with a CSS mask-image: radial-gradient(...) (plus -webkit- prefix) referencing CSS custom properties, per the spec's own suggested alternative,..."
---

# svgMaskEffect

<script setup lang="ts">
import SvgMaskEffectDemo from "../demos/blocks/svgMaskEffect.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `svgMaskEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SvgMaskEffectDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `baseContent` | `DomphyElement \| DomphyElement[]` | Content for the muted base layer (always fully visible). Defaults to a small demo blurb. |
| `revealContent` | `DomphyElement \| DomphyElement[]` | Content for the vivid layer, only visible through the circular reveal window. Defaults to a colorful demo blurb. |
| `restingSize` | `number` | Resting reveal-circle diameter, in px. Defaults to `80`. |
| `hoverSize` | `number` | Reveal-circle diameter while hovered, in px. Defaults to `400`. |
| `easeSpeed` | `number` | Per-frame easing factor (0–1, higher = snappier) for the radius tween. Defaults to `0.18`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Implemented with a CSS mask-image: radial-gradient(...) (plus -webkit- prefix) referencing CSS custom properties, per the spec's own suggested alternative, rather than an SVG &lt;mask&gt; asset with framer-motion motion values (framer-motion is disallowed in this codebase). Pointer x/y are written straight to CSS variables on every pointermove (zero-lag tracking); the reveal radius eases toward its resting/hover target via a small requestAnimationFrame loop that only runs while unconverged (the same 'settled' idiom this package's smoothCursor.ts uses), rather than through WAAPI, since it is a continuously-retargeted single number rather than a fixed from/to keyframe pair.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/svg-mask-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/svgMaskEffect.ts [svgMaskEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
