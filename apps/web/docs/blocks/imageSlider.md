---
title: "@domphy/blocks — imageSlider"
description: "Full-bleed autoplay (5s default) + arrow-key navigation (restarts autoplay timer) + dark overlay + centered content, all implemented."
---

# imageSlider

<script setup lang="ts">
import ImageSliderDemo from "../demos/blocks/imageSlider.ts?raw"
</script>

A **Overlays** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `imageSlider()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ImageSliderDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `images` | `string[]` | Background image URLs, cycled in order. Defaults to 3 generic placeholder photos. |
| `children` | `DomphyElement \| DomphyElement[]` | Content rendered centered above the overlay (heading, button, …). Defaults to a generic demo caption. |
| `overlay` | `boolean` | Dark semi-transparent legibility layer over the image. Defaults to `true`. |
| `overlayStyle` | `StyleObject` | Passthrough style merged onto the overlay layer. |
| `autoplay` | `boolean` | Auto-advances every `intervalMs`. Defaults to `true`. |
| `intervalMs` | `number` | Milliseconds between automatic slide changes. Defaults to `5000`. |
| `direction` | `ImageSliderExitDirection` | Which way the outgoing slide exits. Defaults to `"up"`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Full-bleed autoplay (5s default) + arrow-key navigation (restarts autoplay timer) + dark overlay + centered content, all implemented. Uses a keyed reactive-array swap (`div: (l) =&gt; [buildSlideLayer(...)]`) with the motion() patch for the 3D scale/rotateX entrance and directional (up/down) translateY exit. motion()'s API only supports one shared transition.duration for both enter and exit, so this uses a single ~650ms compromise rather than the spec's differing ~500ms enter / ~1000ms exit numbers (which were themselves flagged 'good-confidence approximation, not exact upstream').

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/images-slider)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/overlays/imageSlider.ts [imageSlider]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
