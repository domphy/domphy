---
title: "@domphy/blocks — backgroundBeamsWithCollision"
description: "Continuous falling-beam + runtime collision-detection loop (measures the container's real getBoundingClientRect().height every frame, matching the spec's note..."
---

# backgroundBeamsWithCollision

<script setup lang="ts">
import BackgroundBeamsWithCollisionDemo from "../demos/blocks/backgroundBeamsWithCollision.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backgroundBeamsWithCollision()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BackgroundBeamsWithCollisionDemo" />

::: details Implementation notes
Continuous falling-beam + runtime collision-detection loop (measures the container's real getBoundingClientRect().height every frame, matching the spec's note that the boundary is derived at runtime) that hides a beam and spawns a short particle burst the instant it crosses the floor, then resets for its next delay/duration/repeatDelay cycle indefinitely. Light background with a black headline plus a purple-to-pink gradient second line (background-clip:text technique, ThemeColor roles instead of literal hex per doctor rules), matching the spec's confirmed-via-screenshot visual. Exact beam count/spawn-rate/particle-scatter constants are reasonable authored defaults, not measured from the original (spec gives no exact numeric defaults for these).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-beams-with-collision)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/backgroundBeamsWithCollision.ts [backgroundBeamsWithCollision]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
