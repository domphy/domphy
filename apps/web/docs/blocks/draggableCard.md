---
title: "@domphy/blocks — draggableCard"
description: "Full behavior match: Pointer Events (pointerdown declaratively, pointermove/pointerup on window for the drag's duration) write position/rotation directly to..."
---

# draggableCard

<script setup lang="ts">
import DraggableCardDemo from "../demos/blocks/draggableCard.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `draggableCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DraggableCardDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `cards` | `DraggableCardItem[]` | — |
| `onDragEnd` | `(id: string, position: { x: number; y: number }) =&gt; void` | — |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full behavior match: Pointer Events (pointerdown declaratively, pointermove/pointerup on window for the drag's duration) write position/rotation directly to each card's inline left/top/transform; rotation is derived from instantaneous drag velocity and smoothed (lag toward target angle) for a natural tilt-while-moving feel; dragging is rubber-band-clamped to the bounding container; release runs an independent spring-damper simulation (same stiffness/damping/mass formula smoothCursor.ts uses) for position AND rotation, producing the spec's slight overshoot-then-settle. Each card's initial tilt is a deterministic pseudo-random angle seeded by index (generated once, never re-randomized).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/draggable-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/draggableCard.ts [draggableCard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
