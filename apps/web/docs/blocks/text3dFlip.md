---
title: "@domphy/blocks — text3dFlip"
description: "Implemented as pure CSS 3D transforms: each character is split into a front/back face pair (position:relative wrapper + absolutely-stacked back face), both..."
---

# text3dFlip

<script setup lang="ts">
import Text3dFlipDemo from "../demos/blocks/text3dFlip.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `text3dFlip()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Text3dFlipDemo" />

::: details Implementation notes
Implemented as pure CSS 3D transforms: each character is split into a front/back face pair (position:relative wrapper + absolutely-stacked back face), both hinged around the configurable edge (top/bottom/left/right -&gt; rotateX/rotateY + matching transform-origin) and revealed via a single `&:hover [data-face=...]` rule on the outer heading, with per-character `transition-delay` computed from `staggerFrom` (start/end/center/index) x `staggerDelay` to produce the wave-across-the-word effect. This faithfully covers the visual/DOM shape, edge choice, and stagger origin/order from the spec. The one real gap: the spec explicitly asks for spring-physics-driven rotation (a damped/bouncy settle, not a fixed duration+easing curve), and Domphy has no spring-animation primitive — `motion()` (the package's only animation patch) only drives Web Animations enter/exit/State keyframes with a fixed CSS `easing` string, not a continuously interactive hover-driven transform, and there is no JS spring library among this package's approved dependencies (cobe/canvas-confetti/rough-notation). Approximated with a hand-tuned CSS `cubic-bezier(0.34, 1.56, 0.64, 1)` 'back-out' overshoot curve on `transition-timing-function`, which reads as bouncy but is a fixed curve, not a true mass/stiffness/damping spring model — configurable via the `easing` prop if a different feel is wanted. Hover-only triggering (no click/keyboard-focus flip path) also means the reveal isn't reachable by keyboard users; the back face is marked `aria-hidden` and the front face carries the real accessible text, so this is a graceful-degradation choice rather than a broken state.

Status: **partial** · Reference: [Magic UI original](https://magicui.design/docs/components/text-3d-flip)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/text3dFlip.ts [text3dFlip]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
