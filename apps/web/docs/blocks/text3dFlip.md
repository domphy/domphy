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

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Front-facing phrase. Defaults to a short demo quote. |
| `flippedChildren` | `string` | Phrase revealed on the flipped (back) face. Defaults to the same text as `children`, rendered in `flippedColor` — i.e. "the same text in a different style" per the spec's default variant. |
| `edge` | `Text3dFlipEdge` | Which edge each character hinges around. Defaults to `"top"`. |
| `staggerDelay` | `number` | Per-character stagger increment, in ms. Defaults to `50`. |
| `staggerFrom` | `Text3dFlipStaggerFrom` | Where the stagger wave originates: from the first character, the last, the center, or a specific character index (rippling outward from there). Defaults to `"start"`. |
| `duration` | `number` | How long each character's own flip takes, in ms. Defaults to `500`. |
| `easing` | `string` | CSS easing for the flip. Defaults to a bouncy cubic-bezier overshoot approximating spring physics (moderate damping/stiffness — bouncy but controlled, not floppy). |
| `color` | `ThemeColor` | Theme color role for the resting, front-facing text. Defaults to `"neutral"`. |
| `flippedColor` | `ThemeColor` | Theme color role for the revealed, flipped text. Defaults to `"primary"`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |
| `frontStyle` | `StyleObject` | Passthrough style merged onto every front-facing character. |
| `flippedStyle` | `StyleObject` | Passthrough style merged onto every flipped (back) character. |

::: details Implementation notes
Implemented as pure CSS 3D transforms: each character is split into a front/back face pair (position:relative wrapper + absolutely-stacked back face), both hinged around the configurable edge (top/bottom/left/right -&gt; rotateX/rotateY + matching transform-origin) and revealed via a single `&:hover [data-face=...]` rule on the outer heading, with per-character `transition-delay` computed from `staggerFrom` (start/end/center/index) x `staggerDelay` to produce the wave-across-the-word effect. This faithfully covers the visual/DOM shape, edge choice, and stagger origin/order from the spec. The one real gap: the spec explicitly asks for spring-physics-driven rotation (a damped/bouncy settle, not a fixed duration+easing curve), and Domphy has no spring-animation primitive — `motion()` (the package's only animation patch) only drives Web Animations enter/exit/State keyframes with a fixed CSS `easing` string, not a continuously interactive hover-driven transform, and there is no JS spring library among this package's approved dependencies (cobe/canvas-confetti/rough-notation). Approximated with a hand-tuned CSS `cubic-bezier(0.34, 1.56, 0.64, 1)` 'back-out' overshoot curve on `transition-timing-function`, which reads as bouncy but is a fixed curve, not a true mass/stiffness/damping spring model — configurable via the `easing` prop if a different feel is wanted. Hover-only triggering (no click/keyboard-focus flip path) also means the reveal isn't reachable by keyboard users; the back face is marked `aria-hidden` and the front face carries the real accessible text, so this is a graceful-degradation choice rather than a broken state.

Status: **partial** · Reference: [Magic UI original](https://magicui.design/docs/components/text-3d-flip)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/text3dFlip.ts [text3dFlip]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
