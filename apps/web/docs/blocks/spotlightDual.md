---
title: "@domphy/blocks — spotlightDual"
description: "Two mirrored groups of three stacked blurred radial-gradient ellipse layers (bright core / medium halo / faint outer glow), each group using the ui motion()..."
---

# spotlightDual

<script setup lang="ts">
import SpotlightDualDemo from "../demos/blocks/spotlightDual.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `spotlightDual()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SpotlightDualDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `color` | `ThemeColor` | Theme color role for the spotlight glow. Defaults to `"info"` (reads as a soft blue, matching the reference's hue ~210). |
| `width` | `number` | Main beam shape width, in `themeSpacing` units. Defaults to `70`. |
| `height` | `number` | Main beam shape height, in `themeSpacing` units. Defaults to `170`. |
| `smallWidth` | `number` | Secondary (narrower) beam layer width, in `themeSpacing` units. Defaults to `36`. |
| `translateY` | `number` | Vertical offset applied to both beam groups, in `themeSpacing` units. Defaults to `-40`. |
| `xOffset` | `number` | Horizontal sway distance per cycle, in `themeSpacing` units. Defaults to `10`. |
| `duration` | `number` | Seconds per sway cycle. Defaults to `7`. |
| `fadeInDuration` | `number` | Mount fade-in duration, in ms. Defaults to `1500`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the spotlights. Defaults to a small demo heading. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Two mirrored groups of three stacked blurred radial-gradient ellipse layers (bright core / medium halo / faint outer glow), each group using the ui motion() patch for a one-shot mount opacity fade-in composed with an independent infinite CSS translateX sway keyframe (the two never conflict since motion() here only ever animates 'opacity', never 'transform'). Default color role is 'info' as a stand-in for the reference's fixed hue ~210 blue.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/spotlight-new)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/spotlightDual.ts [spotlightDual]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
