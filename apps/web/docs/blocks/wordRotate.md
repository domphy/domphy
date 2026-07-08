---
title: "@domphy/blocks — wordRotate"
description: "Single-item reactive keyed-array swap on a setInterval timer (reusing the same enter/exit crossfade state-machine pattern this file's morphingText.ts already..."
---

# wordRotate

<script setup lang="ts">
import WordRotateDemo from "../demos/blocks/wordRotate.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `wordRotate()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="WordRotateDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `words` | `string[]` | Words/phrases cycled through in order, looping back to the first. Defaults to a short demo list. |
| `duration` | `number` | Milliseconds each word stays visible before switching to the next. Defaults to `2500`. |
| `color` | `ThemeColor` | Theme color for the word text. Defaults to `"neutral"` (theme foreground, flips light/dark automatically). |
| `transition` | `WordRotateTransition` | Escape hatch for the enter/exit slide's own timing/easing. See . |
| `style` | `StyleObject` | Passthrough style merged onto the outer block container. |

::: details Implementation notes
Single-item reactive keyed-array swap on a setInterval timer (reusing the same enter/exit crossfade state-machine pattern this file's morphingText.ts already established), driving motion()'s WAAPI initial/animate/exit for a vertical slide+fade rather than morphingText's goo-filter crossfade. Large/bold styling and 'reverses to white in dark mode' both come for free from themeSize(increase-4)/themeColor(shift-11) — no extra dark-mode code needed. transition{duration,easing} is the requested 'escape hatch' for the crossfade's own timing. Direct-source-diff fix (2026-07-05): Slide direction was reversed (entered from below/exited upward) — upstream enters from above and exits downward. Flipped the direction and aligned the timing defaults to upstream's.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/word-rotate)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/wordRotate.ts [wordRotate]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
