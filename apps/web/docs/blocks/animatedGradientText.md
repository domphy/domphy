---
title: "@domphy/blocks — animatedGradientText"
description: "Multi-stop `background-clip:text` gradient panned via an infinite linear `background-position` keyframe animation over a 300%-wide, repeating background, with..."
---

# animatedGradientText

<script setup lang="ts">
import AnimatedGradientTextDemo from "../demos/blocks/animatedGradientText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedGradientText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedGradientTextDemo" />

::: details Implementation notes
Multi-stop `background-clip:text` gradient panned via an infinite linear `background-position` keyframe animation over a 300%-wide, repeating background, with `speed` mapped to animation duration (higher speed = shorter loop). Also implements the spec's optional 'stretch feature' — a pill wrapper whose own border carries the identical flowing gradient, via the classic dual-background-layer trick (opaque padding-box layer + gradient border-box layer, both `background-position`-animated in sync) rather than `mask-composite`, which is simpler and more broadly supported. One documented tradeoff: the upstream spec's literal default hex colors (`#ffaa40` orange → `#9c40ff` purple) can't be used directly since Domphy forbids raw hex/rgb in style props and this theme ships no dedicated purple role — `colorFrom`/`colorVia`/`colorTo` are exposed as `ThemeColor` roles instead, defaulting to warning (orange, matches upstream) → secondary (this theme's rose/magenta family, the closest built-in role to purple) → primary (blue). Same tradeoff this package's `glareHover` component already documents for its own literal-color prop.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-gradient-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/animatedGradientText.ts [animatedGradientText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
