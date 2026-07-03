---
title: "@domphy/blocks — backgroundGradient"
description: "Oversized, heavily blurred backgroundImage gradient layer positioned behind an opaque content wrapper (default demo wraps a `card()` patch), with a single..."
---

# backgroundGradient

<script setup lang="ts">
import BackgroundGradientDemo from "../demos/blocks/backgroundGradient.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backgroundGradient()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BackgroundGradientDemo" />

::: details Implementation notes
Oversized, heavily blurred backgroundImage gradient layer positioned behind an opaque content wrapper (default demo wraps a `card()` patch), with a single `animate` boolean toggling a `background-position`-panning `@keyframes` loop on/off exactly as the spec's researchNote describes. Gradient stops use Domphy theme color roles (success/secondary/info/highlight by default, caller-overridable) instead of literal hex values, matching the framework's no-raw-color constraint.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-gradient)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/backgroundGradient.ts [backgroundGradient]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
