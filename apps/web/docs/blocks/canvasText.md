---
title: "@domphy/blocks — canvasText"
description: "Full behavioral port: a requestAnimationFrame loop draws several sine-driven bezier curves each frame, cycling through the `colors` palette, then clips to the..."
---

# canvasText

<script setup lang="ts">
import CanvasTextDemo from "../demos/blocks/canvasText.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `canvasText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CanvasTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `text` | `string` | Text content rendered as the clipped display heading. Defaults to `"Domphy"`. |
| `colors` | `ThemeColor[]` | Theme color families cycled across the stack of flowing lines. Defaults to `["info", "primary", "secondary"]`. |
| `animationDuration` | `number` | Seconds for one full undulation cycle of the flowing curves. Defaults to `6`. |
| `lineWidth` | `number` | Stroke thickness of each line, in canvas px. Defaults to `2`. |
| `lineGap` | `number` | Vertical spacing between adjacent lines, in canvas px. Defaults to `10`. |
| `curveIntensity` | `number` | Amplitude of each line's waviness, in canvas px. Defaults to `8`. |
| `backgroundClassName` | `string` | Class name applied to an absolutely-positioned backdrop layer behind the clipped canvas, so callers can supply their own light/dark page-matching background. No backdrop element is rendered at all when omitted. |
| `overlay` | `boolean` | Renders the wrapper `position: absolute` instead of `relative`, so it can be stacked on top of other content. Defaults to `false`. |
| `className` | `string` | Extra class name merged onto the wrapper's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the wrapper. |

::: details Implementation notes
Full behavioral port: a requestAnimationFrame loop draws several sine-driven bezier curves each frame, cycling through the `colors` palette, then clips to the exact glyph silhouette every frame via the canvas 2D 'destination-in' compositing trick (fillText with destination-in erases every pixel outside the glyphs — canvas has no native glyph-outline/Path2D API, so this is the standard substitute, and it matches the domSketch's own framing of the clip as derived from 'an offscreen measured/rendered copy of the same text'). Wrapper fontSize is driven through themeSize() (not a hardcoded px number) and resolved back via getComputedStyle for the canvas font string, so dataSize/dataDensity context is respected. Gated by IntersectionObserver so the loop pauses off-screen. An sr-only span carries the real accessible text since the visible glyphs are canvas pixels. Doctor-clean (0 diagnostics) and 3/3 tests pass.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/canvas-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/canvasText.ts [canvasText]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
