---
title: "@domphy/blocks — neonGradientCard"
description: "Three stacked layers in one wrapper: a blurred oversized glow copy of the two-color gradient behind everything, a sharp gradient frame that shows through..."
---

# neonGradientCard

<script setup lang="ts">
import NeonGradientCardDemo from "../demos/blocks/neonGradientCard.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `neonGradientCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="NeonGradientCardDemo" />

::: details Implementation notes
Three stacked layers in one wrapper: a blurred oversized glow copy of the two-color gradient behind everything, a sharp gradient frame that shows through exactly the padding gap the normal-flow content div leaves (no SVG/mask needed), and the content surface on top. Both gradient layers are pointer-events:none and their background-position loops via a CSS keyframe (alternating top-center/bottom-center) for the slow pulsing motion; hovering the wrapper intensifies the glow layer's opacity/blur via a `[data-neon-glow]`-scoped hover selector, matching the spec's hover-enhancement note. Default neonColors ('secondary'/'info') were chosen because those two families are magenta/pink and cyan hues in the default Domphy theme, matching the spec's 'hot pink/magenta paired with cyan' default description — theme tokens are used throughout instead of the literal hex values the upstream spec implies, per this package's color-token constraint.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/neon-gradient-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/neonGradientCard.ts [neonGradientCard]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
