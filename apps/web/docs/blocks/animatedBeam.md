---
title: "@domphy/blocks — animatedBeam"
description: "Default demo renders 3 badge nodes (2 sources + 1 hub) with 2 quadratic-curve beams converging on the hub; nodes/connections are fully overridable via props."
---

# animatedBeam

<script setup lang="ts">
import AnimatedBeamDemo from "../demos/blocks/animatedBeam.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedBeam()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedBeamDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `nodes` | `AnimatedBeamNode[]` | Badge nodes placed inside the canvas. Defaults to a 2-source/1-hub layout. |
| `connections` | `AnimatedBeamConnection[]` | Animated connections between node ids. Defaults to two beams converging on the hub. |
| `height` | `number` | Canvas height in pixels. Defaults to `260`. |

::: details Implementation notes
Default demo renders 3 badge nodes (2 sources + 1 hub) with 2 quadratic-curve beams converging on the hub; nodes/connections are fully overridable via props. Path geometry is measured at runtime via getBoundingClientRect (container + node refs captured through _onMount closures, matching the framework's documented refs pattern) and recomputed on ResizeObserver + window resize/scroll. The traveling glow is realized by animating a &lt;linearGradient&gt;'s userSpaceOnUse x1/y1/x2/y2 as a short moving window interpolated along the straight chord between the two node centers (driven by a plain requestAnimationFrame loop, per the task's guidance to use rAF for SVG path loops instead of CSS keyframes for this kind of JS-measured effect) rather than literally sampling points along the rendered curve via SVGGeometryElement.getPointAtLength — a deliberate simplification (that browser API plus rAF/ResizeObserver are all absent in jsdom, so the component guards every browser-only API and no-ops cleanly in that environment, verified by the 'removes cleanly' test). For modest curvature values this reads visually the same as a curve-following pulse. All SVG &lt;stop&gt; elements carry _doctorDisable:'missing-color' since color has no meaning on a non-text paint-server node; @domphy/doctor diagnose() reports zero issues on the default tree.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-beam)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/animatedBeam.ts [animatedBeam]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
