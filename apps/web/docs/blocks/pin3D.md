---
title: "@domphy/blocks — pin3D"
description: "Full behavior implemented: click-through <a> card, a persistent radar-ping ring on the base dot (reuses this package's pulsatingButton.ts..."
---

# pin3D

<script setup lang="ts">
import Pin3DDemo from "../demos/blocks/pin3D.ts?raw"
</script>

A **Effects 3D** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `pin3D()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Pin3DDemo" />

::: details Implementation notes
Full behavior implemented: click-through &lt;a&gt; card, a persistent radar-ping ring on the base dot (reuses this package's pulsatingButton.ts box-shadow/color-mix(currentColor) keyframe technique verbatim, independent of hover), and a hover-driven beam+title-pill pop-up written via onMouseEnter/onMouseLeave directly setting two State&lt;MotionKeyframe&gt; (no imperative DOM listeners needed). One noted approximation: the spec's 'spring physics... slightly overshoots' is approximated with a cubic-bezier(0.34,1.56,0.64,1) overshoot easing curve rather than a true physical spring simulator, since Domphy's motion() wraps the Web Animations API (CSS easing), not a spring engine — documented in the file header rather than silently treated as identical.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/3d-pin)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/effects-3d/pin3D.ts [pin3D]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
