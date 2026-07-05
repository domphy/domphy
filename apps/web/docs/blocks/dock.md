---
title: "@domphy/blocks — dock"
description: "Continuous per-frame magnification driven by live cursor X via rAF-throttled pointermove, smoothstep falloff from icon distance/proximityMultiplier, imperative..."
---

# dock

<script setup lang="ts">
import DockDemo from "../demos/blocks/dock.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `dock()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DockDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `DockEntry[]` | Icon buttons (and optional `{ separator: true }` group dividers). Defaults to a 7-icon demo dock. |
| `iconSizeUnits` | `number` | Icon diameter, in `themeSpacing` units. Defaults to 10 (~40px at the base font size). |
| `magnification` | `number` | Max scale multiplier reached at closest cursor proximity. Defaults to 1.5. |
| `proximityMultiplier` | `number` | Proximity falloff width, as a multiple of the icon's own rendered size. Defaults to 3.5 (~140px at 40px icons). |
| `anchor` | `DockAnchor` | Which edge the dock is anchored against — flips tooltip placement and each icon's grow-from origin. Defaults to "bottom". |
| `disableMagnification` | `boolean` | Disables the magnification effect entirely, falling back to static icons. Defaults to false. |

::: details Implementation notes
Continuous per-frame magnification driven by live cursor X via rAF-throttled pointermove, smoothstep falloff from icon distance/proximityMultiplier, imperative DOM transform writes (not Domphy reactivity, per the continuous-effect guidance), tooltip integration, separators, anchor-based tooltip placement/transform-origin, disableMagnification toggle, per-icon href/onClick. Gap: no literal spring-physics integrator (mass/stiffness/damping) — approximated with a bouncy CSS cubic-bezier transition on transform, which gives the same qualitative overshoot-then-settle feel driven by continuously recomputed targets, but isn't a real physics simulation.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/dock)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/dock.ts [dock]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
