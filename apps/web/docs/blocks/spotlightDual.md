---
title: "@domphy/blocks — spotlightDual"
description: "Two mirrored groups of three stacked blurred radial-gradient ellipse layers (bright core / medium halo / faint outer glow), each group using the ui motion()..."
---

# spotlightDual

<script setup lang="ts">
import SpotlightDualDemo from "../demos/blocks/spotlightDual.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `spotlightDual()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SpotlightDualDemo" />

::: details Implementation notes
Two mirrored groups of three stacked blurred radial-gradient ellipse layers (bright core / medium halo / faint outer glow), each group using the ui motion() patch for a one-shot mount opacity fade-in composed with an independent infinite CSS translateX sway keyframe (the two never conflict since motion() here only ever animates 'opacity', never 'transform'). Default color role is 'info' as a stand-in for the reference's fixed hue ~210 blue.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/spotlight-new)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/spotlightDual.ts [spotlightDual]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
