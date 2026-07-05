---
title: "@domphy/blocks — canvasRevealEffect"
description: "Reference is a WebGL fragment shader; substituted with a plain 2D canvas rAF loop (the same technique flickeringGrid.ts already uses in this package) that..."
---

# canvasRevealEffect

<script setup lang="ts">
import CanvasRevealEffectDemo from "../demos/blocks/canvasRevealEffect.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `canvasRevealEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CanvasRevealEffectDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `colors` | `ThemeColor[]` | Theme color roles cycled across the dot palette. Defaults to `["info"]` (a single cyan-reading accent, matching the reference's default). |
| `opacities` | `number[]` | Per-dot opacity levels cycled for layered depth. Defaults to a ten-step ramp from dim to full. |
| `animationSpeed` | `number` | Animation speed multiplier (shimmer + ripple frequency). Defaults to `0.4`. |
| `dotSize` | `number` | Side length of each square dot, in canvas px. Defaults to `3`. |
| `gridGap` | `number` | Gap between dots, in canvas px. Defaults to `6`. |
| `showVignette` | `boolean` | Toggles the radial-gradient vignette overlay that contains the dot field. Defaults to `true`. |
| `active` | `ValueOrState&lt;boolean&gt;` | Programmatic reveal control — when provided, hover no longer drives the reveal and this value (or state) does instead. Omit for hover-driven behavior. |
| `children` | `DomphyElement \| DomphyElement[]` | Content rendered above the canvas (typically a card). Defaults to a small demo card. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Reference is a WebGL fragment shader; substituted with a plain 2D canvas rAF loop (the same technique flickeringGrid.ts already uses in this package) that computes each cell's alpha from a lerped reveal-progress value times a distance-phase-shifted sine wave seeded at the pointer's entry cell, approximating the 'ripple expanding from cursor entry' visual without a shader. The spec's literal RGB-tuple palette prop is replaced with a ThemeColor[] role array (default ['info']) per this codebase's no-raw-color rule; canvas fill colors are resolved once via themeColorToken() (a concrete hex string, not a live var()) so they will not re-resolve on a later runtime theme swap, matching flickeringGrid.ts's own documented tradeoff. Supports both hover-driven and externally controlled `active` (ValueOrState&lt;boolean&gt;) modes.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/canvas-reveal-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/canvasRevealEffect.ts [canvasRevealEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
