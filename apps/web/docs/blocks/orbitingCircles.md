---
title: "@domphy/blocks — orbitingCircles"
description: "Full upright-glyph rotate->translateX->counter-rotate CSS @keyframes trick as specified, with animation-direction:reverse for counterclockwise, negative..."
---

# orbitingCircles

<script setup lang="ts">
import OrbitingCirclesDemo from "../demos/blocks/orbitingCircles.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `orbitingCircles()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="OrbitingCirclesDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `(DomphyElement \| OrbitingCircleItem)[]` | Items placed evenly around the ring. Defaults to 6 generic icon-chip placeholders. |
| `center` | `DomphyElement \| null` | Element pinned at the shared center point — does not orbit. Pass `null` to omit. Defaults to a small hub glyph. |
| `iconSizeUnits` | `number` | Orbiting chip box size, in `themeSpacing` units (≈30px at the default). Defaults to 7.5. |
| `radius` | `number` | Ring radius, in px. Defaults to 160. |
| `duration` | `number` | Seconds per full revolution. Defaults to 20. |
| `reverse` | `boolean` | Counterclockwise instead of clockwise. Defaults to false. |
| `speed` | `number` | Multiplies angular velocity (shrinks the effective revolution time). Defaults to 1. |
| `path` | `boolean` | Renders the faint dashed orbit guide circle. Defaults to true. |
| `style` | `StyleObject` | Passthrough style merged onto the outer (relative, overflow-hidden) container. |

::: details Implementation notes
Full upright-glyph rotate-&gt;translateX-&gt;counter-rotate CSS @keyframes trick as specified, with animation-direction:reverse for counterclockwise, negative animation-delay evenly distributed across items (or per-item override), a dashed orbit-guide circle, and a `prefers-reduced-motion` pause. Deviates from upstream's API shape deliberately: rather than each ring being a separate component instance meant to be manually stacked with siblings sharing an external container, this single factory renders one complete, self-contained ring (with an optional non-orbiting center hub glyph) so `orbitingCircles()` alone is a working 'hub and spoke' demo per the package's factory-function contract. Multiple rings can still be composed by calling it multiple times and positioning the returned trees, but that composition is left to the caller rather than baked into a multi-ring prop.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/orbiting-circles)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/orbitingCircles.ts [orbitingCircles]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
