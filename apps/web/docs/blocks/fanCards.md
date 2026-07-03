---
title: "@domphy/blocks — fanCards"
description: "Dark hero with a two-line gradient-shimmer headline (background-clip:text driven by a themed linear-gradient + CSS @keyframes drift, independent of..."
---

# fanCards

<script setup lang="ts">
import FanCardsDemo from "../demos/blocks/fanCards.ts?raw"
</script>

A **Labs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `fanCards()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="FanCardsDemo" />

::: details Implementation notes
Dark hero with a two-line gradient-shimmer headline (background-clip:text driven by a themed linear-gradient + CSS @keyframes drift, independent of interaction) and a tightly-stacked card deck that fans open on hover/tap (shared boolean applied imperatively per card, with a small per-card CSS transitionDelay stagger). Headline copy and card content (mini sparkline + price figures) are original generic 'market dashboard' placeholders, not the reference site's actual copy or mockups -- the spec's own research note flags the live source as unverifiable (fey.com now redirects post-acquisition) and exact fan spread/stagger timing as moderate-confidence, so both are best-guess approximations of the described behavior.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/labs/fey-cards)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/labs/fanCards.ts [fanCards]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
