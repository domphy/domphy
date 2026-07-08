---
title: "@domphy/blocks — globe"
description: "Uses the `cobe` WebGL dot-globe library directly (an approved pre-installed dependency for this exact purpose, per the block-authoring brief) via its public..."
---

# globe

<script setup lang="ts">
import GlobeDemo from "../demos/blocks/globe.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `globe()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GlobeDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `diameterUnits` | `number` | Container max diameter, in `themeSpacing` units. Defaults to 150 (37.5em ≈ 600px, matching upstream's `max-w-150`). |
| `dark` | `boolean` | cobe's own dark-mode shading flag (affects the lighting model, independent of the page theme). Defaults to false. |
| `baseColor` | `[number, number, number]` | Normalized RGB triplet for the sphere's base/land color. Defaults to the theme's neutral "shift-3" token. |
| `markerColor` | `[number, number, number]` | Normalized RGB triplet for marker dots. Defaults to the theme's "attention" "shift-9" token. |
| `glowColor` | `[number, number, number]` | Normalized RGB triplet for the atmosphere glow. Defaults to the theme's neutral "shift-1" token. |
| `mapSamples` | `number` | Dot sample density across the sphere surface. Defaults to 16000. |
| `mapBrightness` | `number` | Land-dot brightness. Defaults to 1.2. |
| `rotationSpeed` | `number` | Auto-rotation speed (phi radians added per frame). Defaults to 0.005. |
| `initialPhi` | `number` | Initial phi (longitude) rotation offset, radians. Defaults to 0. |
| `initialTheta` | `number` | Initial theta (latitude) tilt, radians. Defaults to 0.3. |
| `markers` | `GlobeMarker[]` | Highlighted lat/long locations. Defaults to a handful of major-city reference points. |
| `draggable` | `boolean` | Enables click-and-drag orbit control. Defaults to true. |

::: details Implementation notes
Uses the `cobe` WebGL dot-globe library directly (an approved pre-installed dependency for this exact purpose, per the block-authoring brief) via its public createGlobe(canvas, options) API — real dot-sphere rendering, auto-rotate, drag-to-orbit with velocity-decay inertial coasting, lat/long markers. Canvas is created imperatively in _onMount (not a static Domphy child) to sidestep the parent-Mount-fires-before-children-render ordering gotcha confirmed in ElementNode's render() path. Default sphere/marker/glow colors resolve from the live Domphy theme via themeColorToken rather than guessed literal hex values. Gaps: (1) cobe bakes width/height into construction, so a meaningful container resize recreates the instance rather than mutating it in place; (2) WebGL init is wrapped in try/catch and fails closed to a static empty canvas in environments without a real WebGL context (confirmed via jsdom test, which has none) — visual WebGL rendering itself can't be verified under the jsdom test runtime, only the DOM scaffolding/lifecycle/cleanup around it.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/globe)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/globe.ts [globe]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
