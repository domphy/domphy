---
title: "@domphy/blocks — evervaultCard"
description: "Full implementation: persistent title, 4 corner plus marks, a muted monospace character grid that continuously reshuffles a random subset of cells on an..."
---

# evervaultCard

<script setup lang="ts">
import EvervaultCardDemo from "../demos/blocks/evervaultCard.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `evervaultCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="EvervaultCardDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Persistent title/label text, always legible above the character field. Defaults to `"Hover me"`. |
| `characters` | `string` | Character pool the noise grid is drawn from. Defaults to alphanumerics + a few symbols. |
| `columns` | `number` | Grid column count. Defaults to `22`. |
| `rows` | `number` | Grid row count. Defaults to `13`. |
| `spotlightSize` | `number` | Spotlight diameter, in px. Defaults to `260`. |
| `shuffleIntervalMs` | `number` | How often (ms) a random subset of characters re-rolls. Defaults to `140`. |
| `shuffleFraction` | `number` | Fraction (0-1) of cells re-rolled per shuffle tick. Defaults to `0.05`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer card. |

::: details Implementation notes
Full implementation: persistent title, 4 corner plus marks, a muted monospace character grid that continuously reshuffles a random subset of cells on an interval (independent of the mouse), and a cursor-tracked colorful spotlight. One implementation-choice note: the spotlight reveal is done with a single character layer plus a `mix-blend-mode: color` gradient blob layered above it (isolated in its own stacking context so it never bleeds onto the title), rather than a literal second full-opacity colorful text layer masked in — visually equivalent 'decrypt in focus under the cursor' result with half the DOM nodes and no extra per-cell state.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/evervault-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/evervaultCard.ts [evervaultCard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
