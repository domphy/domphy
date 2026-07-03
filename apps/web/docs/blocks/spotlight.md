---
title: "@domphy/blocks — spotlight"
description: "Plain blurred radial-gradient div (no SVG asset) with the one-time entrance implemented via this package's motion() Web Animations patch, closely matching the..."
---

# spotlight

<script setup lang="ts">
import SpotlightDemo from "../demos/blocks/spotlight.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `spotlight()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SpotlightDemo" />

::: details Implementation notes
Plain blurred radial-gradient div (no SVG asset) with the one-time entrance implemented via this package's motion() Web Animations patch, closely matching the research note's keyframe (translate(-72%,-62%) scale(0.5) opacity 0 -&gt; translate(-50%,-40%) scale(1) opacity 1, ~2s duration, ~0.75s delay, single iteration). A static rotate value is baked into both keyframes so only opacity/scale/position animate, and the persistent (non-animated) style already carries the resting transform/appearance so environments without WAAPI support render the settled look immediately instead of positioned incorrectly or invisible.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/spotlight)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/spotlight.ts [spotlight]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
