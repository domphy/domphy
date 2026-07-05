---
title: "@domphy/blocks — spotlight"
description: "Plain blurred radial-gradient div (no SVG asset) with the one-time entrance implemented via this package's motion() Web Animations patch, closely matching the..."
---

# spotlight

<script setup lang="ts">
import SpotlightDemo from "../demos/blocks/spotlight.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `spotlight()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SpotlightDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `glowColor` | `ThemeColor` | Theme color family for the glow. Defaults to `"neutral"` (a light, near-white glow against a dark section). |
| `top` | `number` | Distance from the section's top edge, in px (can be negative to bleed above it). Defaults to `-20`. |
| `left` | `number` | Distance from the section's left edge, in px. Ignored when `right` is set. Defaults to `-80`. |
| `right` | `number` | Distance from the section's right edge, in px — set this instead of `left` to anchor from the right. |
| `rotation` | `number` | Static tilt, in degrees. Defaults to `-45`. |
| `width` | `number` | Glow ellipse width, in px. Defaults to `560`. |
| `height` | `number` | Glow ellipse height, in px. Defaults to `1400`. |
| `blur` | `number` | Blur radius, in px (higher = softer, less defined edge). Defaults to `140`. |
| `delayMs` | `number` | Delay before the entrance starts, in ms. Defaults to `750`. |
| `durationMs` | `number` | Entrance duration, in ms. Defaults to `2000`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content sitting on top of the section, above the glow. Defaults to a small demo hero blurb. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Plain blurred radial-gradient div (no SVG asset) with the one-time entrance implemented via this package's motion() Web Animations patch, closely matching the research note's keyframe (translate(-72%,-62%) scale(0.5) opacity 0 -&gt; translate(-50%,-40%) scale(1) opacity 1, ~2s duration, ~0.75s delay, single iteration). A static rotate value is baked into both keyframes so only opacity/scale/position animate, and the persistent (non-animated) style already carries the resting transform/appearance so environments without WAAPI support render the settled look immediately instead of positioned incorrectly or invisible.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/spotlight)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/spotlight.ts [spotlight]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
