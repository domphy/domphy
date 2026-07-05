---
title: "@domphy/blocks — backgroundLines"
description: "Pure-CSS traveling-dash technique: each of the (default 40) scattered, randomly-angled/colored quadratic-curve paths gets its own analytically-approximated arc..."
---

# backgroundLines

<script setup lang="ts">
import BackgroundLinesDemo from "../demos/blocks/backgroundLines.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backgroundLines()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BackgroundLinesDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[]` | Content layered above the line scatter. Defaults to a small demo heading/subtext. |
| `lineCount` | `number` | Number of scattered line strokes. Defaults to `40`. |
| `colors` | `ThemeColor[]` | Theme color families cycled across the scattered strokes. Defaults to a broad 9-role palette spanning this theme's built-in families. |
| `svgOptions` | `BackgroundLinesSvgOptions` | SVG animation tuning. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Pure-CSS traveling-dash technique: each of the (default 40) scattered, randomly-angled/colored quadratic-curve paths gets its own analytically-approximated arc length (sampled/summed at generation time, no DOM measurement) driving a per-path stroke-dasharray + per-path @keyframes stroke-dashoffset animation, so a short dash travels each path and loops seamlessly, staggered per path — matching the spec's confirmed-via-screenshot 'isolated traveling dash, not a full drawn curve' look. Palette is exposed as a broad 9-role ThemeColor set (this theme's built-in 'rainbow-ish' families) rather than literal hex, per doctor rules. Note: SVG's `pathLength` normalization attribute was deliberately avoided after discovering it isn't in this framework's small curated CamelAttributes allowlist (would silently render as the wrong-cased, non-functional `path-length`) — the analytic-arc-length + per-path-keyframes approach sidesteps that gap entirely and was verified to compile/render correctly.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-lines)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/backgroundLines.ts [backgroundLines]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
