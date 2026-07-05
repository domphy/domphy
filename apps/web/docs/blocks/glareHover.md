---
title: "@domphy/blocks — glareHover"
description: "Fully functional clean-room port with two deliberate adaptations to Domphy's theme system: (1) the spec's literal hex/CSS glare color is instead a `ThemeColor`..."
---

# glareHover

<script setup lang="ts">
import GlareHoverDemo from "../demos/blocks/glareHover.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `glareHover()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GlareHoverDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[]` | Content wrapped by the glare surface. Defaults to a small demo panel. |
| `glareColor` | `ThemeColor` | Theme color family for the streak. Defaults to `"neutral"` (a bright/white-reading sweep). |
| `glareOpacity` | `number` | Streak alpha, 0–1. Defaults to `0.35`. |
| `angle` | `number` | Sweep angle in degrees. Defaults to `-45`. |
| `size` | `number` | Streak band size, as a percentage of the container's own box. Defaults to `220`. |
| `duration` | `number` | Sweep duration in ms. Defaults to `650`. |
| `playOnce` | `boolean` | When true, the sweep only ever plays on the first pointer-enter. Defaults to `false`. |
| `surface` | `"light" \| "dark"` | Edge-anchor surface tone for the container background. Defaults to `"dark"`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Fully functional clean-room port with two deliberate adaptations to Domphy's theme system: (1) the spec's literal hex/CSS glare color is instead a `ThemeColor` family (default "neutral") resolved via `themeColor()` at `shift-11` off the container's own tone, since Domphy's doctor rules forbid raw hex/rgb colors on style props — this keeps the effect theme-aware (follows light/dark swaps) at the cost of an arbitrary caller hex; opacity is applied with CSS `color-mix()` rather than hex-&gt;rgba conversion. (2) The streak is a diagonal `linear-gradient` baked into `backgroundImage`, swept via an animated `backgroundPosition` (corner-to-corner) rather than translating/rotating a separate overlay element — visually equivalent, simpler CSS, and CSS-only per the animation guidance. `playOnce` is implemented with a JS `animationend` listener that flips a `data-glare-armed` attribute so a CSS `:hover` selector stops retriggering the keyframe after the first sweep; non-playOnce hovers replay every time since the CSS `animation` property is removed (not reversed) the instant `:hover` ends, snapping the band back to its off-canvas rest position instantly (the spec's "resets silently" option).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/glare-hover)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/glareHover.ts [glareHover]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
