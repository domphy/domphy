---
title: "@domphy/blocks — imagesBadge"
description: "Pure-CSS hover fan-out via nested `&:hover [data-images-badge-image='N']` selectors (no JS pointer handlers needed), matching the spec's..."
---

# imagesBadge

<script setup lang="ts">
import ImagesBadgeDemo from "../demos/blocks/imagesBadge.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `imagesBadge()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ImagesBadgeDemo" />

::: details Implementation notes
Pure-CSS hover fan-out via nested `&:hover [data-images-badge-image="N"]` selectors (no JS pointer handlers needed), matching the spec's confirmed-via-live-interaction behavior: folder icon + label at rest, up to 3 thumbnails overlapping behind the folder with a small peeking sliver, fanning out to alternating rotation/translate on hover. The exact resting-state peek offset and fan geometry are aesthetic approximations (the spec gives default sizes/distances but not exact positioning math), tuned to read as 'tiny sliver behind the folder' per the description. `className` (spec prop, not part of Domphy's grammar) maps to the standard `style` passthrough used throughout this package.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/images-badge)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/imagesBadge.ts [imagesBadge]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
