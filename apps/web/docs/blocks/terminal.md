---
title: "@domphy/blocks — terminal"
description: "IntersectionObserver gates the first line's start when startOnView is on (fails open — starts immediately — if IntersectionObserver is unavailable, e.g."
---

# terminal

<script setup lang="ts">
import TerminalDemo from "../demos/blocks/terminal.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `terminal()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TerminalDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `lines` | `TerminalLine[]` | Ordered script of typed-command and fade-output lines. Defaults to a demo install script. |
| `sequence` | `boolean` | Auto-sequence lines one after another (each waits for the previous to finish). Defaults to true. |
| `startOnView` | `boolean` | Only start playback once the window scrolls into view. Defaults to true. |
| `style` | `StyleObject` | — |

::: details Implementation notes
IntersectionObserver gates the first line's start when startOnView is on (fails open — starts immediately — if IntersectionObserver is unavailable, e.g. non-browser test runtimes). Typing lines reveal via a setInterval character loop (default ~60ms/char per the researchNote); fade lines use the motion() patch with a State whose value is set after a delayed setTimeout so the entrance is genuinely deferred rather than firing on mount. Auto-sequencing computes cumulative start delays from each line's own duration; explicit per-line `delay` overrides and can overlap/parallel with neighboring lines as the spec allows. Traffic-light dots and the cursor render as color-glyphs (SVG fill=currentColor / a text block character) rather than backgroundColor fills, specifically to satisfy the tone-background-inherit doctor rule while still being visually a solid vivid dot/block. Direct-source-diff fix (2026-07-05): Output lines entered from below (y:+6, rising up) — upstream's AnimatedSpan enters from above (y:-5, dropping in). Inverted the direction.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/terminal)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/terminal.ts [terminal]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
