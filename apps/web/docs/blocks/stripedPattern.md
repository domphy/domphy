---
title: "@domphy/blocks — stripedPattern"
description: "Full clean-room reimplementation of the three-line-per-tile diagonal-stripe technique (main diagonal + two 10%-tile-sized corner fragments) so the stripe..."
---

# stripedPattern

<script setup lang="ts">
import StripedPatternDemo from "../demos/blocks/stripedPattern.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `stripedPattern()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="StripedPatternDemo" />

::: details Implementation notes
Full clean-room reimplementation of the three-line-per-tile diagonal-stripe technique (main diagonal + two 10%-tile-sized corner fragments) so the stripe continues unbroken across tile seams, using only namespace-safe SVG tags (svg/defs/pattern/line/rect). `direction` ('left'/'right') is implemented by mirroring line endpoint x-coordinates per the spec's own research note, not a CSS transform. Stroke uses currentColor (no themeColor on the line elements themselves) so it inherits the caller's context color, avoiding missing-color entirely. Same demo-wrapper deviation as hexagonPattern (self-sized dataTone panel with default heading/paragraph content for the zero-arg factory contract; the reusable pattern is the inner &lt;svg&gt;). Default tile size 10x10 and default direction 'right' are this port's own judgment (spec didn't state a direction default). doctor CLI: 0 diagnostics.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/striped-pattern)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/stripedPattern.ts [stripedPattern]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
