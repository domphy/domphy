---
title: "@domphy/blocks — expandableCard"
description: "Built on @domphy/ui's dialog() patch (native <dialog>, backdrop fade, Escape/outside-click close, focus trap, scroll lock) so the spec's outside-click-detector..."
---

# expandableCard

<script setup lang="ts">
import ExpandableCardDemo from "../demos/blocks/expandableCard.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `expandableCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ExpandableCardDemo" />

::: details Implementation notes
Built on @domphy/ui's dialog() patch (native &lt;dialog&gt;, backdrop fade, Escape/outside-click close, focus trap, scroll lock) so the spec's outside-click-detector and scroll-lock research-note items come free and are fully correct. The shared-element morph itself is a Web Animations API tween computed from the clicked card's captured getBoundingClientRect() vs the dialog's laid-out rect (translate+scale identity), not a literal same-DOM-node reparent (Domphy has no layoutId/FLIP primitive) -- reads as a real grow-from-source-card morph in a live browser, and degrades gracefully to a plain fade under jsdom/all-zero-rect environments. Marked partial only because the morph is an approximation of a true shared-element transition, not because any spec behavior is missing.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/expandable-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/expandableCard.ts [expandableCard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
