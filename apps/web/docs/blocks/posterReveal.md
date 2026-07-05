---
title: "@domphy/blocks — posterReveal"
description: "Fully data-driven (ordered `layers` array): per-layer motion() cascade (scale/x/y/opacity, configurable delay/duration/easing) into a CSS-grid poster, then a..."
---

# posterReveal

<script setup lang="ts">
import PosterRevealDemo from "../demos/blocks/posterReveal.ts?raw"
</script>

A **Labs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `posterReveal()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="PosterRevealDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `layers` | `PosterLayer[]` | — |
| `revealDuration` | `number` | Default reveal duration for layers that don't set their own, in ms. Defaults to `700`. |
| `revealEasing` | `string` | Default reveal easing for layers that don't set their own — a springy overshoot-then-settle curve (Domphy has no bundled spring integrator; see `dock.ts`/`cardStack.ts` for the same cubic-bezier approximation elsewhere in this package). Defaults to `"cubic-bezier(0.34, 1.56, 0.64, 1)"`. |
| `cameraZoomScale` | `number` | Group-level "camera zoom" scale played once every layer has settled. Defaults to `1.035`. |
| `cameraZoomDuration` | `number` | Camera zoom duration, in ms. Defaults to `1300`. |
| `aspectRatio` | `string` | Poster frame aspect ratio. Defaults to `"3 / 4"` (portrait). |
| `maxWidthUnits` | `number` | Poster frame max width, in `themeSpacing` units. Defaults to `100`. |
| `showReplayControl` | `boolean` | — |
| `onSequenceComplete` | `() =&gt; void` | Fired once, after the last layer has settled and the camera zoom has finished. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Fully data-driven (ordered `layers` array): per-layer motion() cascade (scale/x/y/opacity, configurable delay/duration/easing) into a CSS-grid poster, then a group-level camera-zoom motion() beat delayed until the cascade finishes, plus a working replay control (bumps a version counter folded into each layer's _key to force remount/replay). Spring physics is approximated via a cubic-bezier overshoot easing default (Domphy has no bundled spring integrator, same tradeoff as dock.ts/cardStack.ts elsewhere in this package) rather than true mass/stiffness/damping simulation. Per instructions, the reference demo's actual GTA VI box art is NOT reproduced -- ships with generic themed gradient placeholder panels + a generic wordmark layer. The reference page's secondary 'view code' corner control is omitted -- it's Aceternity's own sandbox chrome, not listed in the component's own props contract.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/labs/gta-vi-poster)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/labs/posterReveal.ts [posterReveal]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
