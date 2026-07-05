---
title: "@domphy/blocks — textFlippingBoard"
description: "Grid of dark (dataTone shift-17) tiles with a monospace bold uppercase glyph and a horizontal hinge seam line each, laid out in rows that word-wrap from `text`..."
---

# textFlippingBoard

<script setup lang="ts">
import TextFlippingBoardDemo from "../demos/blocks/textFlippingBoard.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `textFlippingBoard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TextFlippingBoardDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `text` | `string` | Message to spell out. Supports `\n` for explicit line breaks and is automatically word-wrapped onto further rows past `columns`. Ignored when `rows` is given. Defaults to a short demo message. |
| `rows` | `string[]` | Manual per-row content, taking precedence over `text`. Wrap a run of characters in `{}` to tint just those tiles `accentColor` instead of the default color, e.g. `"WELCOME {HOME}"`. |
| `columns` | `number` | Maximum characters per row before `text` word-wraps onto the next row. Only used when wrapping `text` (ignored when `rows` is given). Defaults to `16`. |
| `duration` | `number` | Total ms budget for the whole board's cascading settle. Defaults to `1200`. |
| `sound` | `boolean` | Plays a short synthesized mechanical "clack" on flip steps via the Web Audio API. Defaults to `false`. |
| `accentColor` | `ThemeColor` | Theme color family for `{}`-tagged accent tiles. Defaults to `"warning"` (reads as orange). |
| `className` | `string` | Extra class name merged onto the outer board's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the outer board container. |

::: details Implementation notes
Grid of dark (dataTone shift-17) tiles with a monospace bold uppercase glyph and a horizontal hinge seam line each, laid out in rows that word-wrap from `text` (own additional `columns` prop, since the spec didn't specify the wrap width knob) or take manual `rows` with a `{tag}`-bracket accent-tint syntax (this implementation's own concrete reading of the docs' vague "'{O}'-style" note). Each tile's flip is a chained setTimeout queue (not WAAPI, so it works in headless/test DOM too) toggling rotateX between 0/+-90deg via plain CSS transitions, using the standard flip-clock reflow trick to swap the glyph mid-rotation; total step count comes from a fixed glyph sequence (2 full cycles + distance-to-target) so 'further' targets genuinely take more steps, while a fixed per-tile time budget after a staggered start delay keeps every tile settling around the same overall duration. Optional `sound` synthesizes a short square-wave 'clack' via the Web Audio API (throttled) rather than an audio file, per the spec's own prop description and since this package ships no audio assets. Exact colors/tile size/font are reasonable defaults (moderate confidence) since upstream's rendered demo wasn't pixel-inspectable; the overall grid/flip-cascade mechanism has higher confidence given the explicit Vestaboard framing in the spec.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/text-flipping-board)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/textFlippingBoard.ts [textFlippingBoard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
