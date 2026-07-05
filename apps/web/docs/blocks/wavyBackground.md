---
title: "@domphy/blocks — wavyBackground"
description: "Canvas 2D rAF loop drawing several overlapping, blurred, semi-transparent wave strokes (one per color) with a slow/fast speed toggle, matching the..."
---

# wavyBackground

<script setup lang="ts">
import WavyBackgroundDemo from "../demos/blocks/wavyBackground.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `wavyBackground()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="WavyBackgroundDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `colors` | `ThemeColor[]` | Theme color families cycled across the wave layers. Defaults to `["info", "primary", "secondary", "highlight"]`. |
| `waveWidth` | `number` | Controls wave frequency/tightness — smaller is tighter. Defaults to `50`. |
| `backgroundColor` | `ThemeColor` | Theme color family for the base fill behind the waves. Defaults to `"neutral"` (near-black). |
| `blur` | `number` | Blur radius applied over the canvas, in px. Defaults to `10`. |
| `speed` | `WavyBackgroundSpeed` | Overall animation pace. Defaults to `"slow"`. |
| `waveOpacity` | `number` | Per-stroke opacity, `0-1`. Defaults to `0.5`. |
| `children` | `DomphyElement \| DomphyElement[]` | Content layered above the waves. Defaults to a small demo heading/subtext. |
| `contentStyle` | `StyleObject` | Passthrough style merged onto the content wrapper. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Canvas 2D rAF loop drawing several overlapping, blurred, semi-transparent wave strokes (one per color) with a slow/fast speed toggle, matching the confirmed-live-screenshot visual (thick glowing multicolor ribbon around vertical mid/lower-mid, heavy blur). Organic variation uses a cheap two-term sum-of-sines per layer rather than true simplex/Perlin noise (this package's only existing noise generator, in vortex.ts, is a full 2D coherent-flow field built for particle drift, overkill for a single flowing ribbon) — a documented, reasonable approximation, not a literal simplex port. The spec's literal hex `colors` prop is exposed as `ThemeColor` roles instead (doctor rules forbid raw hex in style; canvas fillStyle strings are resolved from theme tokens imperatively, following this package's `vortex.ts`/`backgroundBeams.ts` precedent).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/wavy-background)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/wavyBackground.ts [wavyBackground]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
