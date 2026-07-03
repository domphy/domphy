---
title: "@domphy/blocks — auroraBackground"
description: "Pure CSS, no JS: an oversized (300%) multi-radial-gradient layer with backgroundRepeat:'repeat' animates background-position by exactly one tile-width over the..."
---

# auroraBackground

<script setup lang="ts">
import AuroraBackgroundDemo from "../demos/blocks/auroraBackground.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `auroraBackground()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AuroraBackgroundDemo" />

::: details Implementation notes
Pure CSS, no JS: an oversized (300%) multi-radial-gradient layer with backgroundRepeat:'repeat' animates background-position by exactly one tile-width over the loop duration (default 60s, linear, infinite) for a seamless drift, mirroring retroGrid.ts's own 'shift by exactly one tile' keyframe idiom. Optional radial vignette overlay and dark/light variant toggle both implemented. Literal hue bands substituted with ThemeColor roles (default primary/secondary/info).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/aurora-background)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/auroraBackground.ts [auroraBackground]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
