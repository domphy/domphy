---
title: "@domphy/blocks — diaTextReveal"
description: "Gradient sweep via background-clip:text over a plain solid base layer, IntersectionObserver view-trigger, setTimeout-sequenced duration/delay/pauseBetween,..."
---

# diaTextReveal

<script setup lang="ts">
import DiaTextRevealDemo from "../demos/blocks/diaTextReveal.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `diaTextReveal()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DiaTextRevealDemo" />

::: details Implementation notes
Gradient sweep via background-clip:text over a plain solid base layer, IntersectionObserver view-trigger, setTimeout-sequenced duration/delay/pauseBetween, list-cycling with optional infinite repeat, and reserveWidth (ch-based min-width) are all implemented per spec. Gap: the spec's 'requiring a manual trigger' (autoStart:false) implies an external imperative trigger API (e.g. a React ref/method), but this package's components are complete factory-function trees with no exposed imperative handle — substituted with a click-to-play interaction on the element itself as the closest reasonable equivalent, documented in the JSDoc and file header. Default colors use 5 theme ColorRole tokens (primary/secondary/info/success/warning) instead of raw hex, per Domphy's no-literal-color constraint.

Status: **partial** · Reference: [Magic UI original](https://magicui.design/docs/components/dia-text-reveal)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/diaTextReveal.ts [diaTextReveal]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
