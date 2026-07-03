---
title: "@domphy/blocks — glowingStars"
description: "DOM-grid implementation (18x6 divs via CSS grid, per spec's domSketch) rather than canvas: each star owns its own reactive boolean State read by that star's..."
---

# glowingStars

<script setup lang="ts">
import GlowingStarsDemo from "../demos/blocks/glowingStars.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `glowingStars()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GlowingStarsDemo" />

::: details Implementation notes
DOM-grid implementation (18x6 divs via CSS grid, per spec's domSketch) rather than canvas: each star owns its own reactive boolean State read by that star's own backgroundColor/boxShadow/transform, driven by (1) a setInterval idle burst that lights a random subset with staggered setTimeout delays then reverts after a hold period, and (2) pointerenter/pointerleave on the card that lights/unlights every star together. Fade uses a plain CSS transition (duration = glowDurationMs) rather than an explicit multi-keyframe animation, since only a two-state on/off toggle is needed. Corner icon button uses the package's own button() patch styled circular with a hand-drawn diagonal-arrow SVG glyph (no specific icon-library path data) rather than a named icon asset.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/glowing-stars-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/glowingStars.ts [glowingStars]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
