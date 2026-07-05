---
title: "@domphy/blocks — animatedCircularProgressBar"
description: "Full visual/behavior implemented with raw SVG <circle> elements (100x100 viewBox, radius = 50 - strokeWidth/2, matching the research note's ~45/~10 ratio at..."
---

# animatedCircularProgressBar

<script setup lang="ts">
import AnimatedCircularProgressBarDemo from "../demos/blocks/animatedCircularProgressBar.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedCircularProgressBar()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedCircularProgressBarDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `value` | `ValueOrState&lt;number&gt;` | Current progress value. Accepts a value or reactive state. When omitted, the component drives its own demo state, cycling upward in 10% steps. |
| `min` | `number` | Lower bound of `value`'s range. Defaults to `0`. |
| `max` | `number` | Upper bound of `value`'s range. Defaults to `100`. |
| `primaryColor` | `ThemeColor` | Theme color for the progress arc. Defaults to `"primary"`. |
| `secondaryColor` | `ThemeColor` | Theme color for the background track. Defaults to `"neutral"`. |
| `size` | `number` | Ring diameter, in `themeSpacing` units. Defaults to `32`. |
| `strokeWidth` | `number` | SVG stroke width, in viewBox user units (0–100 viewBox, so this is roughly a percentage of the ring's own diameter). Defaults to `10`. |
| `autoPlayIntervalMs` | `number` | Interval, in ms, between auto-demo steps when `value` is omitted. Defaults to `2000`. |
| `label` | `string` | Accessible name for the `role="progressbar"` element. Defaults to `"Progress"`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Full visual/behavior implemented with raw SVG &lt;circle&gt; elements (100x100 viewBox, radius = 50 - strokeWidth/2, matching the research note's ~45/~10 ratio at the strokeWidth=10 default) rather than reusing @domphy/ui's ringProgress() patch, since ringProgress draws its arc via a conic-gradient + circular mask (a wedge fill) whereas the spec explicitly calls for a stroke-dasharray/stroke-dashoffset dash-pattern arc with a rounded starting cap — a materially different rendering technique the existing patch doesn't offer. stroke-dashoffset is a reactive CSS custom property-free function with a 1s cubic-bezier CSS transition, so the arc visually sweeps to the new percentage on every value change; the SVG is rotated -90deg so the sweep starts at 12 o'clock (mirroring ringProgress()'s own 'from -90deg' convention). The centered percentage readout briefly replays a WAAPI opacity fade on every value change (the spec's 'light fade-in on update'). When no `value` prop is passed the component self-drives a demo state via setInterval, cycling +10% every 2s and wrapping back to min, matching the spec's described docs-page demo behavior; passing a `value`/State disables the auto-demo. Doctor-clean; 2 vitest assertions cover initial render (aria-value* + circle/readout counts) and reactive updates when the external state changes.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-circular-progress-bar)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/animatedCircularProgressBar.ts [animatedCircularProgressBar]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
