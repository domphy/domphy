---
title: "@domphy/blocks — bentoGrid"
description: "Generic 'dumb' grid shell (CSS grid, gridAutoFlow: dense, caller-supplied columnSpan/rowSpan per card) with hover choreography (background zoom+blur via a..."
---

# bentoGrid

<script setup lang="ts">
import BentoGridDemo from "../demos/blocks/bentoGrid.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `bentoGrid()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BentoGridDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `cards` | `BentoCardSpec[]` | — |
| `columns` | `number` | Number of grid columns at the widest breakpoint. Defaults to 3. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Generic 'dumb' grid shell (CSS grid, gridAutoFlow: dense, caller-supplied columnSpan/rowSpan per card) with hover choreography (background zoom+blur via a data-attribute selector, CTA arrow nudge, link() patch handles the underline-on-hover text state). The `background` slot accepts arbitrary DomphyElement content per the spec's 'pluggable background widget' guidance. Default demo cards use a simple original drifting gradient-blob background (CSS keyframe + radial-gradient) rather than reimplementing the specific rich widgets shown in the reference demo (file carousel, animated notification list, calendar, globe/beam graphic) — those are called out in the spec itself as swappable per-card content, not part of BentoGrid/BentoCard's own required behavior, so building the shell generically and leaving richer backgrounds to callers (or to the sibling 'effects'/'device-mocks' category components other agents in this pipeline are implementing) was the intentional scope boundary here.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/bento-grid)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/bentoGrid.ts [bentoGrid]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
