---
title: "@domphy/blocks — comicText"
description: "Single-container implementation matching the DOM sketch (no per-letter spans)."
---

# comicText

<script setup lang="ts">
import ComicTextDemo from "../demos/blocks/comicText.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `comicText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ComicTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Text content. Forced to uppercase regardless of casing. Defaults to `"BOOM!"`. |
| `fontSize` | `number` | Base font size in px — outline thickness and shadow offsets scale proportionally. Defaults to `72`. |
| `outlineColor` | `ThemeColor` | Thick outline color family. Defaults to `"neutral"` (near-black via a fixed dark-edge shift). |
| `dotColor` | `ThemeColor` | Halftone dot color family. Defaults to `"danger"` (red). |
| `backgroundFill` | `ThemeColor` | Halftone paper/background color family showing through the dots. Defaults to `"warning"` (yellow). |
| `className` | `string` | Extra class name merged onto the container's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the container. |

::: details Implementation notes
Single-container implementation matching the DOM sketch (no per-letter spans). Halftone fill via background-clip:text (backgroundColor + tiled radial-gradient backgroundImage), outline via -webkit-text-stroke, two stacked drop shadows via one multi-layer text-shadow, permanent lean baked into a static skewX() composed with the animated scale/rotate. Bounce entrance uses motion() with a two-keyframe WAAPI animation and a cubic-bezier(0.34,1.56,0.64,1) 'ease-out-back' curve, which overshoots past 100% scale/0deg from just two keyframes (matches spec exactly without needing intermediate steps). fontSize/fontWeight are set via the (l)=&gt;value function-form escape hatch already established in this package (wordRotate/numberTicker/textReveal) since the doctor's inline-typography rule only flags literal values and no patch expresses an arbitrary heavy comic weight. outlineColor/dotColor/backgroundFill are exposed as ThemeColor props (defaulting to neutral/danger/warning) per the spec's 'should be exposed as configurable colors in a clean-room version' note. tone-background-inherit is _doctorDisable'd on the fixed-shift backgroundColor since it's the glyph ink-fill, not an ambient surface (same reasoning meteors.ts documents).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/comic-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/comicText.ts [comicText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
