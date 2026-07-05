---
title: "@domphy/blocks — cardHoverEffect"
description: "Full behavior match: a single shared highlight <div> (grid's first child, painting below all cards by DOM order) is imperatively repositioned/resized..."
---

# cardHoverEffect

<script setup lang="ts">
import CardHoverEffectDemo from "../demos/blocks/cardHoverEffect.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `cardHoverEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CardHoverEffectDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `CardHoverItem[]` | Cards to render. Defaults to 6 generic feature blurbs. |
| `columns` | `number` | Grid column count at the widest breakpoint. Defaults to `3`. |
| `highlightColor` | `ThemeColor` | Theme color family for the sliding highlight panel. Defaults to `"neutral"`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full behavior match: a single shared highlight &lt;div&gt; (grid's first child, painting below all cards by DOM order) is imperatively repositioned/resized (left/top/width/height) via getBoundingClientRect() on each card's pointerenter, animated purely with a CSS transition (no Framer Motion layoutId equivalent exists in Domphy, so this is a hand-rolled FLIP-by-CSS-transition instead of a true shared-element reparent). Opacity only toggles on the whole group's mouseleave (not each card's), which is what makes card-to-card hover glide instead of refade. Doctor-clean; passes doctor's tone-background-inherit/low-contrast/missing-color checks (with one documented _doctorDisable on the intentionally-decorative highlight panel, matching the existing magicCard.ts precedent).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/card-hover-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/cardHoverEffect.ts [cardHoverEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
