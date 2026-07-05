---
title: "@domphy/blocks — shineBorder"
description: "Implemented as a full-perimeter SVG ring (not a dashed comet, unlike borderBeam) whose gradient orientation is continuously rotated by a native SMIL..."
---

# shineBorder

<script setup lang="ts">
import ShineBorderDemo from "../demos/blocks/shineBorder.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `shineBorder()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ShineBorderDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `thickness` | `number` | Ring thickness in pixels. Defaults to `2`. |
| `duration` | `number` | One full rotation, in seconds — slower/calmer than `borderBeam`'s comet. Defaults to `14`. |
| `colors` | `ThemeColor[]` | Colors the ring blends through, in order. Defaults to `["primary", "highlight", "warning"]`. |
| `borderRadius` | `number` | Corner radius in pixels, should roughly match the host card's own rounding. Defaults to `16`. |
| `children` | `DomphyElement[]` | Card content rendered inside the shined container. Defaults to a small demo card body. |

::: details Implementation notes
Implemented as a full-perimeter SVG ring (not a dashed comet, unlike borderBeam) whose gradient orientation is continuously rotated by a native SMIL &lt;animateTransform attributeName="gradientTransform" type="rotate"&gt;. This was chosen over CSS custom-property (@property) angle interpolation because Domphy's core CSS-in-JS compiler (packages/core/src/classes/StyleRule.ts) only recognizes @media/@supports/@container/@layer/@keyframes/@font-face as hoistable at-rules — an inline `[`@property ...`]` style key would silently be dropped, not registered — so a Houdini-typed-property rotation isn't reachable from Domphy's style object grammar today. SMIL animateTransform is native declarative SVG markup (already in @domphy/core's SvgTags list) with solid support across evergreen browsers and needs no JS/rAF at all, matching the spec's 'always-on, no interaction' requirement and giving a seamless loop for free (0deg and 360deg are visually identical). A second, wider, blurred duplicate ring is layered underneath for the described soft shimmer. Doctor-clean.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/shine-border)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/shineBorder.ts [shineBorder]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
