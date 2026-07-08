---
title: "@domphy/blocks — shimmerButton"
description: "Full behavioral/visual port from the spec, matching its stated masked-rotating-gradient technique."
---

# shimmerButton

<script setup lang="ts">
import ShimmerButtonDemo from "../demos/blocks/shimmerButton.ts?raw"
</script>

A **Buttons** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `shimmerButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ShimmerButtonDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[] \| string` | Button label content. Defaults to `"Shimmer Button"`. |
| `background` | `ThemeColor` | Fill color family for the button's dark base and the ring's solid mask layer. Defaults to `"neutral"` (near-black, via a `shift-15` dark edge anchor). |
| `shimmerColor` | `ThemeColor` | Color family the rotating highlight sliver is drawn from. Defaults to `"neutral"` (near-white). |
| `shimmerSize` | `string` | Thickness of the visible ring, as a CSS length. Defaults to `"0.05em"`. |
| `shimmerDuration` | `number` | One full rotation around the border, in seconds. Defaults to `3`. |
| `borderRadius` | `number` | Corner radius in pixels. Defaults to `100` (near-pill). |
| `onClick` | `(event: MouseEvent) =&gt; void` | — |
| `disabled` | `boolean` | — |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full behavioral/visual port from the spec, matching its stated masked-rotating-gradient technique. An oversized (200%) conic-gradient patch with one bright wedge is continuously rotated via a plain CSS transform keyframe (linear, infinite, shimmerDuration) behind everything; a same-color solid layer sits on top of it inset by shimmerSize on every side, so only a shimmerSize-thick ring of the rotating layer peeks out — exactly the spec's domSketch (rotating gradient sliver masked to a thin ring, separate radial hover-highlight layer, label on top). overflow:hidden on the button is present as the spec's researchNote calls essential. Hover glow opacity is toggled purely via CSS using a data-slot descendant selector on the button's own :hover state (no JS/state needed), mirroring this package's sidebar row-action hover pattern. The dark near-black base uses a shift-15 dataTone edge anchor (doctor's fixed-surface idiom) instead of a literal color, so background/shimmerColor stay ThemeColor roles rather than caller-supplied hex, keeping the whole component theme-aware. Verified doctor-clean (0 findings) via the domphy-doctor CLI.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/shimmer-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/buttons/shimmerButton.ts [shimmerButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
