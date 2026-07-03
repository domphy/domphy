---
title: "@domphy/blocks — containerScrollAnimation"
description: "position:sticky pinned range drives a single rAF-lerped State<number> read by reactive style.transform on the card (rotateX from a caller-tunable..."
---

# containerScrollAnimation

<script setup lang="ts">
import ContainerScrollAnimationDemo from "../demos/blocks/containerScrollAnimation.ts?raw"
</script>

A **Scroll** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `containerScrollAnimation()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ContainerScrollAnimationDemo" />

::: details Implementation notes
position:sticky pinned range drives a single rAF-lerped State&lt;number&gt; read by reactive style.transform on the card (rotateX from a caller-tunable initialRotationDegrees down to 0, scale from initialScale up to 1) and a subtle opacity/translateY on the header, exactly matching the spec's continuous, scroll-bound (not keyframe) motion. perspective is set via themeSpacing on the sticky ancestor so the rotateX reads as real 3D depth.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/container-scroll-animation)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/scroll/containerScrollAnimation.ts [containerScrollAnimation]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
