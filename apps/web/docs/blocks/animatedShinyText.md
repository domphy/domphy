---
title: "@domphy/blocks — animatedShinyText"
description: "Single-span `background-clip:text` gradient whose resting flanks are a semi-transparent muted-gray `color-mix()` tone and whose middle stop is a brighter tone;..."
---

# animatedShinyText

<script setup lang="ts">
import AnimatedShinyTextDemo from "../demos/blocks/animatedShinyText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedShinyText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedShinyTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Label text. Defaults to `"Introducing Domphy Blocks"`. |
| `shimmerWidth` | `number` | Pixel width of the bright sweeping band. Narrower reads as a sharp glint, wider as a soft glow. Defaults to `100`. |
| `duration` | `number` | One full sweep loop, in ms. Defaults to `8000`. |
| `color` | `ThemeColor` | Theme color family for the muted resting text. Defaults to `"neutral"`. |
| `showBadge` | `boolean` | Wraps the text in the rounded pill/badge shown in the spec's demo, with a trailing arrow that nudges right on hover. Defaults to `true`. |
| `icon` | `DomphyElement` | Optional leading icon/glyph rendered before the text inside the badge. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Single-span `background-clip:text` gradient whose resting flanks are a semi-transparent muted-gray `color-mix()` tone and whose middle stop is a brighter tone; animating `background-position` across an oversized `background-size` sweeps the bright point through the glyphs on a pure-CSS infinite loop (no JS per-frame work). `shimmerWidth` maps directly to the gradient's `calc(50% ± Npx)` stop offsets. Ships wrapped in the spec's pill/badge by default (`showBadge`), with a trailing arrow glyph that nudges right on hover via a separate, independent CSS hover rule. One documented tradeoff: the upstream spec doesn't specify the shimmer's exact resting/peak colors, so both are derived from `themeColor()` roles (fully theme/dark-mode aware) rather than fixed literals.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-shiny-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/animatedShinyText.ts [animatedShinyText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
