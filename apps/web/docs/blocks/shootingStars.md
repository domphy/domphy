---
title: "@domphy/blocks — shootingStars"
description: "Stationary field is a single inline SVG of randomly-placed circles (per spec's domSketch) with one shared @keyframes twinkle pulse reused across..."
---

# shootingStars

<script setup lang="ts">
import ShootingStarsDemo from "../demos/blocks/shootingStars.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `shootingStars()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ShootingStarsDemo" />

::: details Implementation notes
Stationary field is a single inline SVG of randomly-placed circles (per spec's domSketch) with one shared @keyframes twinkle pulse reused across differently-timed animation values, so only twinklingProbability's fraction of stars twinkle at any time. Shooting stars are spawned via a setTimeout chain into a reactive State&lt;Entry[]&gt; list (same shape as this package's animatedList.ts) and travel via the motion() WAAPI patch, with x/y expressed in vmax units (mirrors meteors.ts) so the diagonal reads consistently regardless of container aspect ratio; a matching setTimeout removes each entry once its travel animation finishes. Default trail/head colors are theme roles (info/secondary) rather than the research note's literal hex (#2EB9DF/#9E00FF), since Domphy's design system forbids raw hex/rgb color literals in style objects. Minor graceful-degradation edge case: in a hypothetical browser without the Web Animations API, a spawned star would render as a static bright dot for its travel duration rather than visibly streaking (it is still cleanly removed on schedule) - WAAPI is universally supported in evergreen browsers so this is not expected to matter in practice.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/shooting-stars-and-stars-background)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/shootingStars.ts [shootingStars]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
