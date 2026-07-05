---
title: "@domphy/blocks — dottedGlowBackground"
description: "Canvas particle-loop technique (same shape as this package's flickeringGrid): each dot's alpha oscillates continuously via sin(elapsedSeconds * randomSpeed +..."
---

# dottedGlowBackground

<script setup lang="ts">
import DottedGlowBackgroundDemo from "../demos/blocks/dottedGlowBackground.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `dottedGlowBackground()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DottedGlowBackgroundDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `spacing` | `number` | Grid gap between dots, in canvas px. Defaults to `24`. |
| `dotRadius` | `number` | Base dot radius, in canvas px. Defaults to `1.5`. |
| `dotColor` | `ThemeColor` | Theme color family for the dot fill. Defaults to `"neutral"`. |
| `glowColor` | `ThemeColor` | Theme color family for the glow halo. Defaults to `"primary"`. |
| `layerOpacity` | `number` | Overall layer opacity multiplier, 0–1. Defaults to `0.7`. |
| `vignette` | `boolean` | Radially fades dots out near the container's edges/corners instead of a hard cutoff. Defaults to `true`. |
| `minPulseSpeed` | `number` | Minimum per-dot pulse angular speed, in rad/s. Defaults to `0.4`. |
| `maxPulseSpeed` | `number` | Maximum per-dot pulse angular speed, in rad/s. Defaults to `1.3`. |
| `speedMultiplier` | `number` | Global multiplier applied on top of every dot's own randomized speed. Defaults to `1`. |
| `width` | `number` | Fixed canvas width, in px. Omit to fill the parent container's measured width. |
| `height` | `number` | Fixed canvas height, in px. Omit to fill the parent container's measured height. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the dot grid. Defaults to a small demo heading. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Canvas particle-loop technique (same shape as this package's flickeringGrid): each dot's alpha oscillates continuously via sin(elapsedSeconds * randomSpeed + randomPhase) — radius stays fixed, only glow brightness pulses, matching the spec. Glow halo uses canvas shadowBlur/shadowColor. IntersectionObserver pauses the rAF loop off-screen; ResizeObserver recomputes the grid. Optional radial vignette is a CSS mask-image on the canvas rather than an extra draw pass. The spec's separate light-mode/dark-mode color pairs were intentionally NOT exposed as distinct props — Domphy's theme tokens (dotColor/glowColor as ThemeColor roles) already resolve differently per active theme automatically, so a manual light/dark pair would be redundant with the framework's own token model.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/dotted-glow-background)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/dottedGlowBackground.ts [dottedGlowBackground]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
