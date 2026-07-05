---
title: "@domphy/blocks — vortex"
description: "Canvas 2D requestAnimationFrame particle loop (same shape as this package's particles.ts/flickeringGrid.ts)."
---

# vortex

<script setup lang="ts">
import VortexDemo from "../demos/blocks/vortex.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `vortex()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="VortexDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `particleCount` | `number` | Number of particles. Defaults to `700`. |
| `baseHue` | `number` | Base hue, in degrees (0–360). Defaults to `220` (blue). |
| `hueRange` | `number` | Total hue variation spread across particles, in degrees. Defaults to `100`. |
| `backgroundColor` | `ThemeColor` | Theme color family for the container surface (and the canvas's trailing-fade tint). Defaults to `"neutral"` (near-black). |
| `baseSpeed` | `number` | Minimum per-particle speed, in canvas px/frame. Defaults to `0`. |
| `rangeSpeed` | `number` | Extra randomized speed added on top of `baseSpeed`. Defaults to `1.5`. |
| `baseRadius` | `number` | Minimum particle radius, in canvas px. Defaults to `1`. |
| `rangeRadius` | `number` | Extra randomized radius added on top of `baseRadius`. Defaults to `2`. |
| `rangeY` | `number` | Vertical spawn spread around the container's vertical center, in canvas px. Defaults to `100`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content centered on top of the particle field. Defaults to a small demo heading/subtext/CTA. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Canvas 2D requestAnimationFrame particle loop (same shape as this package's particles.ts/flickeringGrid.ts). The noise field driving each particle's swirl angle is a small self-authored classic 2D gradient/Perlin-style noise implementation (permutation table + bilinear interpolation), not simplex-noise - that package is not among this package's installed dependencies (only cobe/canvas-confetti/rough-notation are), so a from-scratch implementation of the standard public-domain Perlin algorithm was used instead; it produces the same smooth, continuous, coherent field the effect needs. Trailing streaks are produced by painting a low-alpha rectangle over the previous frame each tick (rather than clearRect), matching the spec's 'trail, not full clear' description.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/vortex)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/vortex.ts [vortex]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
