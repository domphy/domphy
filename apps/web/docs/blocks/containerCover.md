---
title: "@domphy/blocks — containerCover"
description: "Pure CSS-driven panel visibility: a toState<boolean> (`hovered`, seeded true when `alwaysOn`) drives opacity+scale via a plain CSS transition, no imperative..."
---

# containerCover

<script setup lang="ts">
import ContainerCoverDemo from "../demos/blocks/containerCover.ts?raw"
</script>

A **Layout** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `containerCover()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ContainerCoverDemo" />

::: details Implementation notes
Pure CSS-driven panel visibility: a toState&lt;boolean&gt; (`hovered`, seeded true when `alwaysOn`) drives opacity+scale via a plain CSS transition, no imperative DOM writes. Beam strips are looping CSS @keyframes translateX gradients (default 4, randomized duration/delay per beam so they desync — non-deterministic across SSR/hydration paints, same tradeoff this package's own backgroundBeams.ts accepts). Sparkles reuse sparklesText.ts's self-rescheduling-timer spawn/retire technique, with the reschedule interval read fresh off the hover/alwaysOn flag each spawn so density increases while active. Beam count/timing/color and sparkle count were flagged low/moderate-confidence in the spec's own researchNote (source not directly inspectable) — implemented as reasonable, prop-tunable defaults (beamCount, sparkleCount, accentColor, cornerRadius) rather than confirmed values. Also discovered and worked around a framework-level gotcha in this file (and the other two): an unconditional `class: props.className` clobbers the element's own auto-generated CSS-in-JS style class when className is undefined (ElementNode.merge's `class` branch only special-cases string/function values, so `set('class', undefined)` overwrites the auto class instead of being a no-op) — fixed locally via conditional spread (`...(props.className ? { class: props.className } : {})`); this same unconditional pattern exists in ~15+ other files across the repo (e.g. textHoverEffect.ts) and was left unfixed there as out of scope for this task.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/container-cover)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/layout/containerCover.ts [containerCover]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
