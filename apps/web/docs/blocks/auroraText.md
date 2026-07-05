---
title: "@domphy/blocks — auroraText"
description: "Diagonal multi-color `background-clip: text` gradient that pans back and forth via CSS `animation-direction: alternate` (8s / speed multiplier, ease-in-out,..."
---

# auroraText

<script setup lang="ts">
import AuroraTextDemo from "../demos/blocks/auroraText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `auroraText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AuroraTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Text content. Defaults to `"Aurora Text"`. |
| `colors` | `ThemeColor[]` | Gradient color families the sweep cycles through. Defaults to four theme roles standing in for magic UI's pink/purple/blue/cyan palette. |
| `speed` | `number` | Speed multiplier — `2` sweeps twice as fast, `0.5` half as fast. Defaults to `1`. |
| `as` | `AuroraTextTag` | Wrapping element tag. Defaults to `"span"`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Diagonal multi-color `background-clip: text` gradient that pans back and forth via CSS `animation-direction: alternate` (8s / speed multiplier, ease-in-out, infinite) -- matches the spec's own description of an alternating, easing ping-pong loop almost exactly, and is simpler/more correct than a hand-authored 3-stop keyframe. First color is repeated at the gradient's end so the pan never shows a seam, per the spec. Default 4-color pink/purple/blue/cyan palette is mapped to theme color-family roles (`secondary`, `highlight`, `primary`, `info`) instead of literal hex, since Domphy's doctor rules forbid raw hex/rgb colors on style props -- same documented tradeoff this package's existing `animatedGradientText` block already makes for its own default colors. Accessibility uses the exact sr-only-text + aria-hidden-decorative-gradient-copy structure the spec's own DOM sketch describes, reusing the same pattern already established elsewhere in this package (`sidebarInDialog`). Direct-source-diff fix (2026-07-05): Was a plain horizontal gradient pan — upstream's real @keyframes pans a 4-corner background-position path AND wobbles each glyph (±5° rotate, 0.9-1.1 scale). Replicated the real keyframe and glyph wobble.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/aurora-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/auroraText.ts [auroraText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
