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

::: details Implementation notes
Reuses magicCard.ts's own content-box/border-box mask XOR ring technique, but drives a conic-gradient (swept by the angle from the card's center to the pointer) instead of a radial spotlight at the raw cursor position. Proximity radius (point-to-rect distance) and a central inactiveZone dead-zone (fraction of half-diagonal) both gate activation; a single document-level pointermove listener lets many instances react to the same global pointer, per the spec. Angle easing ('trails and catches up') is done via a manual per-frame circular lerp on a CSS custom property rather than a CSS transition, because animating a custom property's angle with `transition` requires the `@property` Houdini at-rule, which this codebase's CSS-in-JS style layer has no support for — noted as the one real fidelity gap. Also intentionally deviates from the reference's own default (disabled: true, opt-in only) by defaulting `disabled` to `false` so the zero-argument demo actually shows the effect for docs/screenshots; the prop still exists and behaves identically when set.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/glowing-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/glowingEffect.ts [glowingEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
