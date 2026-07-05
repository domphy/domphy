---
title: "@domphy/blocks — layoutMotionCards"
description: "Scattered/rotated card grid straightens+scales into a centered, enlarged state on hover or click (single continuous `transform`/`left`/`top` transition carries..."
---

# layoutMotionCards

<script setup lang="ts">
import LayoutMotionCardsDemo from "../demos/blocks/layoutMotionCards.ts?raw"
</script>

A **Labs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `layoutMotionCards()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LayoutMotionCardsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `LayoutMotionCardItem[]` | — |
| `activeIndex` | `ValueOrState&lt;number \| null&gt;` | Which card (if any) is expanded. Pass a `State&lt;number\|null&gt;` for controlled external control (hover/click still update it). Defaults to `null` (nothing expanded). |
| `trigger` | `"hover" \| "click"` | What activates a card. Defaults to `"hover"`. |
| `cardWidthUnits` | `number` | Resting card width, in `themeSpacing` units. Defaults to `26` (portrait, `3 / 4` aspect ratio). |
| `expandedScale` | `number` | Expanded card scale, relative to its resting width. Defaults to `1.8`. |
| `onActiveChange` | `(index: number \| null) =&gt; void` | — |
| `style` | `StyleObject` | — |

::: details Implementation notes
Scattered/rotated card grid straightens+scales into a centered, enlarged state on hover or click (single continuous `transform`/`left`/`top` transition carries scale+rotation+position together, matching the spec's 'one physical card scaling up' framing). A true FLIP/getBoundingClientRect() shared-layout measurement was deliberately not used -- both the resting and expanded geometries are fully known in advance, so a reactive style write (applied both synchronously on interaction and via a State listener for external control) is simpler and equally correct. 'Sibling cards shift aside to make room' is approximated via scale-down + dim rather than literal position reflow, since the source spec itself flags the exact expand mechanics as inferred (live demo interaction was never observed).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/labs/interface-crafts-cards)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/labs/layoutMotionCards.ts [layoutMotionCards]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
