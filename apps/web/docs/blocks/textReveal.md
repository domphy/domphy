---
title: "@domphy/blocks — textReveal"
description: "Scroll-scrubbed (bidirectional) word reveal via a sticky inner container inside an oversized outer wrapper, matching the spec's DOM sketch exactly (muted..."
---

# textReveal

<script setup lang="ts">
import TextRevealDemo from "../demos/blocks/textReveal.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `textReveal()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TextRevealDemo" />

::: details Implementation notes
Scroll-scrubbed (bidirectional) word reveal via a sticky inner container inside an oversized outer wrapper, matching the spec's DOM sketch exactly (muted full-text background layer + per-word foreground layer). Progress is computed with getBoundingClientRect()/window.innerHeight in a rAF-debounced scroll+resize listener (no IntersectionObserver needed since it must be continuous/bidirectional, not a one-shot trigger). No CSS keyframes involved, as specified. Word opacity mapping and the exact 0/1 anchor points (wrapper top hits viewport top / wrapper bottom hits viewport bottom) are my own reasonable interpretation of 'progress 0 at entry, 1 at fully scrolled past', since the spec doesn't pin down the precise anchor formula.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/text-reveal)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/textReveal.ts [textReveal]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
