---
title: "@domphy/blocks — backgroundBeams"
description: "Uses the package's existing 'static path, moving gradient' technique (same idiom as animatedBeam.ts): procedurally generated S-curve fibers with a per-beam..."
---

# backgroundBeams

<script setup lang="ts">
import BackgroundBeamsDemo from "../demos/blocks/backgroundBeams.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backgroundBeams()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BackgroundBeamsDemo" />

::: details Implementation notes
Uses the package's existing 'static path, moving gradient' technique (same idiom as animatedBeam.ts): procedurally generated S-curve fibers with a per-beam linearGradient sliding through objectBoundingBox coordinates, driven by a single IntersectionObserver-gated rAF loop. Two intentional divergences from the reference: (1) default beam count capped at 20 rather than ~50 for perf, per the spec's own research note; (2) the reference's literal cyan/purple/magenta or orange/red hex gradient stops are replaced with cycling Domphy ThemeColor roles (default info/primary/secondary) since raw hex/rgb is forbidden by doctor rules — visually reads as multi-hued across the beam field but each single beam's band is limited to the theme's own color ramp rather than an arbitrary hue.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-beams)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/backgroundBeams.ts [backgroundBeams]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
