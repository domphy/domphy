---
title: "@domphy/blocks — textRevealCard"
description: "Dark charcoal card (edge-anchored dataTone shift-16) with a dim gradient-clipped base text line and a brighter gradient-clipped + text-shadow revealed line..."
---

# textRevealCard

<script setup lang="ts">
import TextRevealCardDemo from "../demos/blocks/textRevealCard.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `textRevealCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TextRevealCardDemo" />

::: details Implementation notes
Dark charcoal card (edge-anchored dataTone shift-16) with a dim gradient-clipped base text line and a brighter gradient-clipped + text-shadow revealed line whose clip-path inset() is updated 1:1 (no easing) from the pointer's horizontal fraction across the card on every mousemove, with the CSS transition explicitly disabled during drag and re-enabled only on mouseleave for the ~400ms eased reset -- matches the spec's own described mechanism and timing. A thin gradient-filled indicator blade tracks the same fraction and tilts up to +-2.5deg based on distance from center. 140 (default, configurable via starCount) small twinkling dot stars scattered at random positions pulse opacity/scale on independently randomized per-star duration/delay via one shared @keyframes. Exact colors/tile styling are reasonable defaults per the task's own researchNote (moderate-to-good confidence, corroborated via the cited Svelte-port cross-reference in the spec).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/text-reveal-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/textRevealCard.ts [textRevealCard]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
