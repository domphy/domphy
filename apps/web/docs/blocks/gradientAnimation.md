---
title: "@domphy/blocks — gradientAnimation"
description: "Five independently-animated blurred blob layers (two axis-oscillating with alternate direction, one diagonal, two approximate-elliptical orbits via 5 sampled..."
---

# gradientAnimation

<script setup lang="ts">
import GradientAnimationDemo from "../demos/blocks/gradientAnimation.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `gradientAnimation()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GradientAnimationDemo" />

::: details Implementation notes
Five independently-animated blurred blob layers (two axis-oscillating with alternate direction, one diagonal, two approximate-elliptical orbits via 5 sampled keyframe stops looping one direction) over a base linear-gradient backdrop, each with its own duration (24-40s) and mixed linear/ease-in-out timing so they drift out of phase, composited via a caller-configurable CSS mix-blend-mode (default hard-light) — matches the spec's staggered-timing and blend-mode requirements. The optional pointer-follow blob (on by default, toggle via `interactive`) uses an imperative rAF-lerped 'ease toward pointer' technique since it can't be a CSS keyframe loop. Deliberate simplification: the reference's additional SVG 'goo' filter (an feColorMatrix alpha-threshold trick that sharpens blur into fused blob edges) was skipped in favor of blur()+mix-blend-mode alone, which already reads as a fluid merging glow without that filter's fiddly, engine-dependent tuning — documented at the top of the file. Blob colors are Domphy theme color roles rather than literal RGB values (info/secondary/primary/error/warning + a pointer role), consistent with the framework's token-only color system; base gradient likewise uses two ThemeColor roles instead of the reference's literal rgb(108,0,162)/rgb(0,17,82) defaults.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-gradient-animation)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/gradientAnimation.ts [gradientAnimation]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
