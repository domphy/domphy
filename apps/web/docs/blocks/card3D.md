---
title: "@domphy/blocks — card3D"
description: "Full implementation: continuous 1:1 pointermove-driven rotateX/rotateY on the card body (transition disabled during tracking for zero-lag feel), eased reset..."
---

# card3D

<script setup lang="ts">
import Card3DDemo from "../demos/blocks/card3D.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `card3D()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Card3DDemo" />

::: details Implementation notes
Full implementation: continuous 1:1 pointermove-driven rotateX/rotateY on the card body (transition disabled during tracking for zero-lag feel), eased reset transition on pointer-leave, and a generic per-item depth API (x/y/z/rotateX/rotateY/rotateZ) so callers can configure their own 'popped' layers; defaults to a 4-item demo (heading, paragraph, image, footer link) with sensible depth presets per the spec's own guidance. No gaps.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/3d-card-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/card3D.ts [card3D]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
