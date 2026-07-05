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

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Text content to reveal, split into words on whitespace. Defaults to a short demo paragraph. |
| `mutedColor` | `ThemeColor` | Theme color for the always-visible faint background copy. Defaults to `"neutral"`. |
| `activeColor` | `ThemeColor` | Theme color each word resolves to once fully revealed. Defaults to `"neutral"`. |
| `wrapperHeightVh` | `number` | How tall the scroll wrapper is, in viewport-height units — more height means more scroll distance (and a slower-feeling reveal) for the same word count. Defaults to `200` (2x viewport), clamped to a minimum of `120`. |
| `style` | `StyleObject` | Passthrough style merged onto the sticky, centered inner container. |

::: details Implementation notes
Scroll-scrubbed (bidirectional) word reveal via a sticky inner container inside an oversized outer wrapper, matching the spec's DOM sketch exactly (muted full-text background layer + per-word foreground layer). Progress is computed with getBoundingClientRect()/window.innerHeight in a rAF-debounced scroll+resize listener (no IntersectionObserver needed since it must be continuous/bidirectional, not a one-shot trigger). No CSS keyframes involved, as specified. Word opacity mapping and the exact 0/1 anchor points (wrapper top hits viewport top / wrapper bottom hits viewport bottom) are my own reasonable interpretation of 'progress 0 at entry, 1 at fully scrolled past', since the spec doesn't pin down the precise anchor formula.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/text-reveal)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/textReveal.ts [textReveal]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
