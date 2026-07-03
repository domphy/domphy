---
title: "@domphy/blocks — auroraText"
description: "Diagonal multi-color `background-clip: text` gradient that pans back and forth via CSS `animation-direction: alternate` (8s / speed multiplier, ease-in-out,..."
---

# auroraText

<script setup lang="ts">
import AuroraTextDemo from "../demos/blocks/auroraText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `auroraText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AuroraTextDemo" />

::: details Implementation notes
Diagonal multi-color `background-clip: text` gradient that pans back and forth via CSS `animation-direction: alternate` (8s / speed multiplier, ease-in-out, infinite) -- matches the spec's own description of an alternating, easing ping-pong loop almost exactly, and is simpler/more correct than a hand-authored 3-stop keyframe. First color is repeated at the gradient's end so the pan never shows a seam, per the spec. Default 4-color pink/purple/blue/cyan palette is mapped to theme color-family roles (`secondary`, `highlight`, `primary`, `info`) instead of literal hex, since Domphy's doctor rules forbid raw hex/rgb colors on style props -- same documented tradeoff this package's existing `animatedGradientText` block already makes for its own default colors. Accessibility uses the exact sr-only-text + aria-hidden-decorative-gradient-copy structure the spec's own DOM sketch describes, reusing the same pattern already established elsewhere in this package (`sidebarInDialog`).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/aurora-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/auroraText.ts [auroraText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
