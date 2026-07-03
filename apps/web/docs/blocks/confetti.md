---
title: "@domphy/blocks — confetti"
description: "Ported using the already-approved `canvas-confetti` dependency (`confettiLib.create(canvas, opts)`), matching upstream's documented default fire options plus..."
---

# confetti

<script setup lang="ts">
import ConfettiDemo from "../demos/blocks/confetti.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `confetti()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ConfettiDemo" />

::: details Implementation notes
Ported using the already-approved `canvas-confetti` dependency (`confettiLib.create(canvas, opts)`), matching upstream's documented default fire options plus the spec's square/circle/star shape mix. Returns a bare `&lt;canvas&gt;` (fixed, full-viewport, transparent, pointer-events:none, aria-hidden) and exposes an imperative `{ fire, reset }` handle via `onReady`, per the spec's "exposed imperative handle/ref" requirement. One deliberate default-behavior choice: `autoFire` defaults to `false` (the canvas stays inert until `onReady`'s handle fires it, or `autoFire: true` is passed) rather than bursting automatically on mount — this matches the primitive's real-world purely-imperative usage and avoids touching the 2D canvas context in environments without a real canvas backend (verified: canvas-confetti's `.create()` never touches `getContext` synchronously, so this is a design choice, not a technical limitation).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/confetti)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/confetti.ts [confetti]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
