---
title: "@domphy/blocks — wobbleCard"
description: "Full behavior match: mousemove writes a damped (6% of raw offset, capped at 18px) translate + 1.03 scale directly to the content layer's inline transform,..."
---

# wobbleCard

<script setup lang="ts">
import WobbleCardDemo from "../demos/blocks/wobbleCard.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `wobbleCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="WobbleCardDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement[]` | Card body — heading, description, optional image. Defaults to a generic demo blurb. |
| `color` | `ThemeColor` | Theme color family for the card's background/text ramp. Defaults to `"primary"`. |
| `noise` | `boolean` | Renders the decorative grain overlay. Defaults to `true`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer card container. |
| `contentStyle` | `StyleObject` | Passthrough style merged onto the inner content wrapper that receives the wobble transform. |

::: details Implementation notes
Full behavior match: mousemove writes a damped (6% of raw offset, capped at 18px) translate + 1.03 scale directly to the content layer's inline transform, easing back to rest on mouseleave via a static CSS transition. Grain overlay is a tiled feTurbulence SVG data-URI used as a CSS background-image (not a real SVG filter element tree, since Domphy's SvgTags allowlist doesn't yet namespace feTurbulence/feColorMatrix — same gap noiseTexture.ts documents) rather than a canvas draw loop, kept independent to avoid duplicating noiseTexture.ts's canvas logic; toggleable via the noise prop.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/wobble-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/wobbleCard.ts [wobbleCard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
