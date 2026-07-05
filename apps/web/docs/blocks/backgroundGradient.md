---
title: "@domphy/blocks — backgroundGradient"
description: "Oversized, heavily blurred backgroundImage gradient layer positioned behind an opaque content wrapper (default demo wraps a `card()` patch), with a single..."
---

# backgroundGradient

<script setup lang="ts">
import BackgroundGradientDemo from "../demos/blocks/backgroundGradient.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backgroundGradient()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BackgroundGradientDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[]` | Content wrapped by the glow — typically a card. Defaults to a small demo card. |
| `animate` | `boolean` | Continuously animates the glow's gradient position on an endless loop. When `false`, the glow renders as a fixed, static colorful blur. Defaults to `true`. |
| `glowColors` | `ThemeColor[]` | Theme color roles blended into the glow gradient, in stop order. Defaults to a four-hue mix (`success`, `secondary`, `info`, `highlight`). |
| `blurRadius` | `number` | Blur radius applied to the glow layer, in `themeSpacing` units. Defaults to `24`. |
| `duration` | `number` | One drift cycle, in seconds. Defaults to `6`. |
| `contentStyle` | `StyleObject` | Passthrough style merged onto the content wrapper (the card's own background/border/radius). |
| `style` | `StyleObject` | Passthrough style merged onto the outer container (sizing/margin). |

::: details Implementation notes
Oversized, heavily blurred backgroundImage gradient layer positioned behind an opaque content wrapper (default demo wraps a `card()` patch), with a single `animate` boolean toggling a `background-position`-panning `@keyframes` loop on/off exactly as the spec's researchNote describes. Gradient stops use Domphy theme color roles (success/secondary/info/highlight by default, caller-overridable) instead of literal hex values, matching the framework's no-raw-color constraint.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-gradient)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/backgroundGradient.ts [backgroundGradient]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
