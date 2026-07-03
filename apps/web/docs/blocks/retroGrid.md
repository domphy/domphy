---
title: "@domphy/blocks — retroGrid"
description: "Uses the spec's own suggested simplification (explicitly called 'visually equivalent and far simpler to reimplement' in the research note) rather than the..."
---

# retroGrid

<script setup lang="ts">
import RetroGridDemo from "../demos/blocks/retroGrid.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `retroGrid()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="RetroGridDemo" />

::: details Implementation notes
Uses the spec's own suggested simplification (explicitly called 'visually equivalent and far simpler to reimplement' in the research note) rather than the production fragment-shader ray-cast: two layered repeating-linear-gradients stand in for the tiled grid-line background image, inside a `perspective` + `rotateX(angle)` tilted plane, with a single linear-infinite @keyframes shifting `background-position` by exactly one grid tile per cycle for a seamless loop. A full-size top-to-bottom gradient overlay (fading the demo panel's own themeColor(l,'inherit') background to transparent) blends the horizon, and `prefers-reduced-motion: reduce` pauses the animation via `animationPlayState` (same pattern as this package's existing orbitingCircles.ts). Distance-based line thinning/LOD is intentionally out of scope, exactly as the spec itself allows ('a nice-to-have refinement'). `lightLineColor`/`darkLineColor` are both Domphy ThemeColor props (not literal colors) and are differentiated via a `prefers-color-scheme: dark` CSS media override -- an OS-level switch, since this standalone component has no hook into whatever app-level mechanism a consuming app uses to flip Domphy's own active theme; Domphy's themeColor() tone system already re-resolves per Domphy's active theme separately from this OS-level override.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/retro-grid)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/retroGrid.ts [retroGrid]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
