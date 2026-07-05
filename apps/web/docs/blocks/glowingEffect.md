---
title: "@domphy/blocks — glowingEffect"
description: "Reuses magicCard.ts's own content-box/border-box mask XOR ring technique, but drives a conic-gradient (swept by the angle from the card's center to the..."
---

# glowingEffect

<script setup lang="ts">
import GlowingEffectDemo from "../demos/blocks/glowingEffect.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `glowingEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GlowingEffectDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `variant` | `"default" \| "white"` | `"default"` sweeps a multi-color arc; `"white"` is a monochrome neutral glow. Defaults to `"default"`. |
| `colors` | `ThemeColor[]` | Theme color roles cycled across the multi-color arc, `"default"` variant only. Defaults to `["info", "primary", "secondary"]`. |
| `blur` | `number` | Blur radius applied to the glow ring, in px. Defaults to `8`. |
| `inactiveZone` | `number` | Central dead-zone size as a fraction (0–1) of the card's own half-diagonal — pointer positions inside this radius from center never trigger the glow, even directly over the card's middle. Defaults to `0.6`. |
| `proximity` | `number` | How far outside the card's edge (in px) the effect still triggers. Defaults to `80`. |
| `spread` | `number` | Angular width of the bright arc, in degrees. Defaults to `90`. |
| `borderWidth` | `number` | Ring thickness, in `themeSpacing` units. Defaults to `1`. |
| `alwaysOn` | `boolean` | Forces the glow to show at a fixed angle without any pointer tracking. Defaults to `false`. |
| `disabled` | `boolean` | Turns off all pointer interactivity — the ring renders but never lights up (unless `alwaysOn`). The reference component defaults this to `true`; this factory defaults it to `false` instead so calling it with no arguments still demonstrates the effect (see `fidelityNotes`). |
| `borderRadius` | `number` | Corner radius, in `themeSpacing` units. Defaults to `4`. |
| `children` | `DomphyElement \| DomphyElement[]` | Card content wrapped by the glow. Defaults to a small demo card body. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
Reuses magicCard.ts's own content-box/border-box mask XOR ring technique, but drives a conic-gradient (swept by the angle from the card's center to the pointer) instead of a radial spotlight at the raw cursor position. Proximity radius (point-to-rect distance) and a central inactiveZone dead-zone (fraction of half-diagonal) both gate activation; a single document-level pointermove listener lets many instances react to the same global pointer, per the spec. Angle easing ('trails and catches up') is done via a manual per-frame circular lerp on a CSS custom property rather than a CSS transition, because animating a custom property's angle with `transition` requires the `@property` Houdini at-rule, which this codebase's CSS-in-JS style layer has no support for — noted as the one real fidelity gap. Also intentionally deviates from the reference's own default (disabled: true, opt-in only) by defaulting `disabled` to `false` so the zero-argument demo actually shows the effect for docs/screenshots; the prop still exists and behaves identically when set.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/glowing-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/glowingEffect.ts [glowingEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
