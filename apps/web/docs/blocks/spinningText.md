---
title: "@domphy/blocks — spinningText"
description: "Fully declarative, matches the spec's domSketch/animation description directly: the input phrase is repeated with a separator until the ring reads full (~28..."
---

# spinningText

<script setup lang="ts">
import SpinningTextDemo from "../demos/blocks/spinningText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `spinningText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SpinningTextDemo" />

::: details Implementation notes
Fully declarative, matches the spec's domSketch/animation description directly: the input phrase is repeated with a separator until the ring reads full (~28 chars), each character gets a precomputed `rotate(angle) translate(0, calc(radius * -1))` transform placing it at its point on the circle, and the whole character group carries a single continuous linear CSS @keyframes rotation (default 10s/revolution, reverse flag flips direction). No lifecycle/JS driving needed. No meaningful fidelity gaps versus the spec.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/spinning-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/spinningText.ts [spinningText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
