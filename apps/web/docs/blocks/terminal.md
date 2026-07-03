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

::: details Implementation notes
IntersectionObserver gates the first line's start when startOnView is on (fails open — starts immediately — if IntersectionObserver is unavailable, e.g. non-browser test runtimes). Typing lines reveal via a setInterval character loop (default ~60ms/char per the researchNote); fade lines use the motion() patch with a State whose value is set after a delayed setTimeout so the entrance is genuinely deferred rather than firing on mount. Auto-sequencing computes cumulative start delays from each line's own duration; explicit per-line `delay` overrides and can overlap/parallel with neighboring lines as the spec allows. Traffic-light dots and the cursor render as color-glyphs (SVG fill=currentColor / a text block character) rather than backgroundColor fills, specifically to satisfy the tone-background-inherit doctor rule while still being visually a solid vivid dot/block.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/terminal)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/terminal.ts [terminal]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
