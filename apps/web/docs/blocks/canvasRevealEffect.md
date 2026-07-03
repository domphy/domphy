---
title: "@domphy/blocks — canvasRevealEffect"
description: "Reference is a WebGL fragment shader; substituted with a plain 2D canvas rAF loop (the same technique flickeringGrid.ts already uses in this package) that..."
---

# canvasRevealEffect

<script setup lang="ts">
import CanvasRevealEffectDemo from "../demos/blocks/canvasRevealEffect.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `canvasRevealEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CanvasRevealEffectDemo" />

::: details Implementation notes
Reference is a WebGL fragment shader; substituted with a plain 2D canvas rAF loop (the same technique flickeringGrid.ts already uses in this package) that computes each cell's alpha from a lerped reveal-progress value times a distance-phase-shifted sine wave seeded at the pointer's entry cell, approximating the 'ripple expanding from cursor entry' visual without a shader. The spec's literal RGB-tuple palette prop is replaced with a ThemeColor[] role array (default ['info']) per this codebase's no-raw-color rule; canvas fill colors are resolved once via themeColorToken() (a concrete hex string, not a live var()) so they will not re-resolve on a later runtime theme swap, matching flickeringGrid.ts's own documented tradeoff. Supports both hover-driven and externally controlled `active` (ValueOrState&lt;boolean&gt;) modes.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/canvas-reveal-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/canvasRevealEffect.ts [canvasRevealEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
