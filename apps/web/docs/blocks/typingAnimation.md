---
title: "@domphy/blocks — typingAnimation"
description: "Single string or phrase-list cycling (type -> pause -> delete faster -> next phrase, looping when `loop` is set) via a chained-setTimeout state machine, same..."
---

# typingAnimation

<script setup lang="ts">
import TypingAnimationDemo from "../demos/blocks/typingAnimation.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `typingAnimation()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TypingAnimationDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `text` | `string \| string[]` | Text to type, or a list of phrases to cycle through. Defaults to a short demo phrase. |
| `typingSpeed` | `number` | ms per character while typing. Defaults to `100`. |
| `deletingSpeed` | `number` | ms per character while deleting. Defaults to roughly twice as fast as typing (`typingSpeed / 2`). |
| `pauseDuration` | `number` | ms a fully-typed phrase is held before deleting starts. Only relevant with multiple phrases. Defaults to `1000`. |
| `startDelay` | `number` | ms before the very first character types. Defaults to `0`. |
| `loop` | `boolean` | Cycles back to the first phrase after the last. Only relevant with multiple phrases. Defaults to `true`. |
| `showCursor` | `boolean` | Shows the trailing cursor glyph. Defaults to `true`. |
| `cursorBlink` | `boolean` | Blinks the cursor. When `false`, the cursor is shown static (solid). Defaults to `true`. |
| `cursorStyle` | `TypingCursorStyle` | Cursor glyph shape. Defaults to `"line"`. |
| `startOnView` | `boolean` | Waits until the wrapper scrolls into view before typing starts. Defaults to `false`. |
| `as` | `TypingAnimationTag` | Wrapping element tag. Defaults to `"span"`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
Single string or phrase-list cycling (type -&gt; pause -&gt; delete faster -&gt; next phrase, looping when `loop` is set) via a chained-setTimeout state machine, same technique this package's `terminal()` block already uses for its typed lines. Grapheme-safe slicing via `Intl.Segmenter` (falls back to `Array.from`) so multi-byte characters/emoji never split mid-glyph, per the spec's own research note. Default typing speed 100ms/char, deleting speed ~2x faster, 1000ms phrase pause, matching the spec's documented defaults. Cursor blink is a CSS steps() opacity keyframe (matches spec's 'looping CSS opacity keyframe' description exactly). One real deviation: the three cursor shapes (line/block/underscore) are rendered as themed text glyphs ('▏' / '█' / '_') sized by the inherited font-size, rather than a literal drawn box with explicit width/height -- this follows this package's own established idiom (documented in `terminal.ts`'s cursor/traffic-light glyphs) of using a solid-fill text glyph + `color` instead of a `backgroundColor` box specifically so it doesn't trip the doctor's `tone-background-inherit` rule, which exists to keep surface-shifting centralized on `dataTone` containers. Visually equivalent, implemented differently.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/typing-animation)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/typingAnimation.ts [typingAnimation]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
