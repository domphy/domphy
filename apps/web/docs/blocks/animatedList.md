---
title: "@domphy/blocks — animatedList"
description: "Full behavior: interval-driven insertion (configurable delay/maxItems/direction/loop), motion()-driven fade+translateY+scale entrance with an ease-out-back..."
---

# animatedList

<script setup lang="ts">
import AnimatedListDemo from "../demos/blocks/animatedList.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedList()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedListDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `AnimatedListItem[]` | Source notifications cycled one at a time into the feed. Defaults to a sample activity stream. |
| `intervalDelay` | `number` | Milliseconds between each new item's insertion. Defaults to 1000. |
| `maxItems` | `number` | Max items kept mounted before the oldest are recycled out. Defaults to 5. |
| `direction` | `"top" \| "bottom"` | Insertion edge: "top" pushes new items in above (list grows downward), "bottom" appends below (list grows upward). Defaults to "top". |
| `loop` | `boolean` | Wrap back to the start of `items` once exhausted. Defaults to true. |
| `maxHeightUnits` | `number` | Container max-height, in `themeSpacing` units. Defaults to 112 (~28em). |

::: details Implementation notes
Full behavior: interval-driven insertion (configurable delay/maxItems/direction/loop), motion()-driven fade+translateY+scale entrance with an ease-out-back cubic-bezier curve, transitionGroup() FLIP reflow for the push-down of existing cards, CSS hover scale-up (isolated on an inner wrapper so it doesn't fight the outer WAAPI entrance transform), and a bottom (or top, for direction:'bottom') gradient fade mask. Only simplification: the entrance easing is a cubic-bezier approximation of a spring, not a literal mass/stiffness/damping integrator (Domphy's motion() patch has no such primitive) — matches the same approximation used elsewhere in this port batch (e.g. terminal.ts).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-list)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/animatedList.ts [animatedList]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
