---
title: "@domphy/blocks — dottedGlowBackground"
description: "Canvas particle-loop technique (same shape as this package's flickeringGrid): each dot's alpha oscillates continuously via sin(elapsedSeconds * randomSpeed +..."
---

# dottedGlowBackground

<script setup lang="ts">
import DottedGlowBackgroundDemo from "../demos/blocks/dottedGlowBackground.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `dottedGlowBackground()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DottedGlowBackgroundDemo" />

::: details Implementation notes
Canvas particle-loop technique (same shape as this package's flickeringGrid): each dot's alpha oscillates continuously via sin(elapsedSeconds * randomSpeed + randomPhase) — radius stays fixed, only glow brightness pulses, matching the spec. Glow halo uses canvas shadowBlur/shadowColor. IntersectionObserver pauses the rAF loop off-screen; ResizeObserver recomputes the grid. Optional radial vignette is a CSS mask-image on the canvas rather than an extra draw pass. The spec's separate light-mode/dark-mode color pairs were intentionally NOT exposed as distinct props — Domphy's theme tokens (dotColor/glowColor as ThemeColor roles) already resolve differently per active theme automatically, so a manual light/dark pair would be redundant with the framework's own token model.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/dotted-glow-background)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/dottedGlowBackground.ts [dottedGlowBackground]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
