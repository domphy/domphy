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

::: details Implementation notes
Full implementation: persistent title, 4 corner plus marks, a muted monospace character grid that continuously reshuffles a random subset of cells on an interval (independent of the mouse), and a cursor-tracked colorful spotlight. One implementation-choice note: the spotlight reveal is done with a single character layer plus a `mix-blend-mode: color` gradient blob layered above it (isolated in its own stacking context so it never bleeds onto the title), rather than a literal second full-opacity colorful text layer masked in — visually equivalent 'decrypt in focus under the cursor' result with half the DOM nodes and no extra per-cell state.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/evervault-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/evervaultCard.ts [evervaultCard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
