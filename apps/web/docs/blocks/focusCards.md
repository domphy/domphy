---
title: "@domphy/blocks — focusCards"
description: "Full behavior match: a closure-tracked hovered index drives each card's inline transform/filter (scale 1.04 + zero blur on the hovered card, blur(4px)..."
---

# focusCards

<script setup lang="ts">
import FocusCardsDemo from "../demos/blocks/focusCards.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `focusCards()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="FocusCardsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `cards` | `FocusCardItem[]` | — |
| `onSelect` | `(index: number) =&gt; void` | — |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full behavior match: a closure-tracked hovered index drives each card's inline transform/filter (scale 1.04 + zero blur on the hovered card, blur(4px) brightness(0.6) on every sibling), applied imperatively on pointer enter and cleared only on the group's own mouseleave (so moving between adjacent cards re-targets without a flicker). Static CSS transition on transform/filter does the actual animating -- no manual keyframes or rAF needed, matching the spec's research note.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/focus-cards)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/focusCards.ts [focusCards]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
