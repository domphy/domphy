---
title: "@domphy/blocks — lightRays"
description: "Pure CSS @keyframes implementation (per this package's documented convention for continuous effects, e.g."
---

# lightRays

<script setup lang="ts">
import LightRaysDemo from "../demos/blocks/lightRays.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `lightRays()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LightRaysDemo" />

::: details Implementation notes
Pure CSS @keyframes implementation (per this package's documented convention for continuous effects, e.g. meteors()/dottedMap()) rather than the motion() patch, because motion() only supports a single initial-&gt;animate 2-keyframe transition and can't express a multi-stop (0%/50%/100%) infinite pulse+sway. Each ray gets two independent per-instance @keyframes (opacity pulse, rotation sway) with randomized left position, base tilt, width, swing amplitude, delay and duration (baked in at generation time, hashString-named per the meteors()/dottedMap() unique-animation-name pattern), applied together via the CSS `animation` shorthand's comma-separated multi-value syntax on the same element so they run in perfect lockstep — a legitimate reading of the spec's 'two coupled infinite-loop animations'. Two static (non-animated) radial-gradient glow blobs pinned to the top corners via themeColor, blurred; `mix-blend-mode: screen` on both rays and glows for the additive-style blend described. Ray shape uses `clip-path: polygon(...)` to taper the beam (spec: 'tapered gradient shape') rather than upstream's likely SVG/canvas approach — a reasonable CSS-only equivalent. `color` default mapped to Domphy's 'primary' ThemeColor family (spec's literal default was 'a soft translucent light blue', which isn't an available literal in this framework — themed instead, per project convention of never using raw hex/rgb). Demo wrapper is a dark (dataTone shift-15) self-sized panel with default heading+paragraph, matching this package's zero-arg-demo convention. doctor CLI: 0 diagnostics.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/light-rays)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/lightRays.ts [lightRays]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
