---
title: "@domphy/blocks — progressiveBlur"
description: "Static (no animation) edge-fade overlay built from N stacked, absolutely-positioned bands per edge, each with an increasing `backdrop-filter: blur()` (default..."
---

# progressiveBlur

<script setup lang="ts">
import ProgressiveBlurDemo from "../demos/blocks/progressiveBlur.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `progressiveBlur()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ProgressiveBlurDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `edges` | `ProgressiveBlurEdge[]` | Which edge(s) get a blur fade. Defaults to `["bottom"]`. |
| `thickness` | `number \| string` | Thickness of the blurred zone: a `themeSpacing` unit count, or a raw CSS length/percentage. Defaults to `"30%"`. |
| `blurSteps` | `number[]` | Blur radii (px), one band per entry, applied in the caller's given order — entry 0 = innermost/lightest layer, last entry = outermost edge layer. Never sorted (matches upstream). Defaults to `[0.5, 1, 2, 4, 8, 16, 32, 64]`. |
| `content` | `DomphyElement[]` | The underlying content the blur overlays. Defaults to a short demo panel. |
| `overlayContent` | `DomphyElement` | Optional content rendered inside the blurred region (e.g. a "show more" affordance). |
| `style` | `StyleObject` | — |

::: details Implementation notes
Static (no animation) edge-fade overlay built from N stacked, absolutely-positioned bands per edge, each with an increasing `backdrop-filter: blur()` (default steps [0.5,1,2,4,8,16,32,64]px matching the spec's suggested array) and a `mask-image: linear-gradient()` whose visibility window overlaps its neighbors by one step so the discrete blur radii blend into a continuous-looking fade rather than showing hard seams — this overlap formula is an original design (the exact upstream masking algorithm was never viewed) but produces the same 'purely blur intensity, no color gradient' effect described in the spec. Supports top/bottom/both edges, a configurable thickness (percentage or themeSpacing unit count, default 30% matching the spec's default), and optional overlay content anchored inside the blurred region.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/progressive-blur)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/progressiveBlur.ts [progressiveBlur]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
