---
title: "@domphy/blocks — shinyButton"
description: "Pill button with a continuous (not hover-gated) diagonal shimmer, built as a single <button> whose own layered background (solid dataTone-anchored surface + a..."
---

# shinyButton

<script setup lang="ts">
import ShinyButtonDemo from "../demos/blocks/shinyButton.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `shinyButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ShinyButtonDemo" />

::: details Implementation notes
Pill button with a continuous (not hover-gated) diagonal shimmer, built as a single &lt;button&gt; whose own layered background (solid dataTone-anchored surface + a color-mix() gradient streak swept via background-position keyframe) produces the sheen, matching the domSketch's 'no separate overlay needed' guidance. Duration/shimmer-width are both JS props AND mirrored into --shiny-button-duration/--shiny-button-shimmer-width CSS custom properties per the spec's own suggestion. Hover adds scale+brightness; disabled dims the button, pauses the shimmer (a judgment call — the spec doesn't address the disabled+loop interaction explicitly) and sets the native disabled attribute. Exact shimmer color/duration aren't published upstream (spec's own researchNote flags this), so timing (3000ms) and streak width (35%) mirror this package's already-ported animatedShinyText/glareHover techniques.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/shiny-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/shinyButton.ts [shinyButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
