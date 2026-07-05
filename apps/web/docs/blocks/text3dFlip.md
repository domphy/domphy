---
title: "@domphy/blocks — text3dFlip"
description: "Faithful to upstream's real technique."
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
| `children` | `string` | Text to flip. Defaults to a short demo phrase. |
| `flippedChildren` | `string` | Opt-in Domphy extra: a second phrase shown on the flipped (back) face. Defaults to the same text as `children` — i.e. the same glyph on both faces, matching upstream exactly. Only diverges from upstream if you set it. |
| `edge` | `Text3dFlipEdge` | Which edge each character rolls around. Defaults to `"right"` (upstream's default), i.e. rotateY. |
| `staggerDelay` | `number` | Per-character stagger increment, in ms. Defaults to `50`. |
| `staggerFrom` | `Text3dFlipStaggerFrom` | Where the stagger wave originates: the first character, the last, the center, a random character (re-picked per play), or a specific index. Defaults to `"first"`. |
| `duration` | `number` | How long each character's own roll takes, in ms. Defaults to `500`. |
| `easing` | `string` | CSS easing for the roll. Defaults to a bouncy "back out" cubic-bezier approximating upstream's spring settle. |
| `color` | `ThemeColor` | Theme color role for the resting, front-facing text. Defaults to `"neutral"`. |
| `flippedColor` | `ThemeColor` | Opt-in Domphy extra: theme color role for the flipped (back) face. Defaults to the same value as `color` so both faces look identical (upstream behavior). Only diverges if you set it. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |
| `frontStyle` | `StyleObject` | Passthrough style merged onto every front-facing character. |
| `flippedStyle` | `StyleObject` | Passthrough style merged onto every flipped (back) character. |

::: details Implementation notes
Faithful to upstream's real technique. Each character is a two-face 3D cell: a front face plus a PERPENDICULAR second face carrying the SAME glyph, offset out along the character's own depth (translateZ / translateX(50%)). On hover a JS `mouseenter` handler drives the Web Animations API to roll every character 90° so its second face swings into view, staggered character-by-character (`staggerFrom` first/last/center/random/index x `staggerDelay`), then — via `fill: 'none'` — instantly reverts each cell to rest the moment its own roll finishes. That is upstream's one-shot ripple-and-return: the roll passes across the word as a wave and snaps back; it does NOT hold while the pointer stays over the text. No perspective is applied anywhere (upstream is orthographic), so the depth offsets only position the faces and never foreshorten, and the resting cube-corner transform is visually identity. The four transform maps (container / front-face / second-face / rotation, keyed by edge top/right/bottom/left) are ported verbatim from upstream; default edge is right/rotateY. One honest gap: upstream's roll is a mass/stiffness/damping spring and Domphy has no spring primitive, so it is approximated with a 'back out' `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot (configurable via the `easing` prop) — the same documented gap as numberTicker/smoothCursor. Accessibility: the full phrase is exposed via an sr-only label (as upstream does) and the animated cells are `aria-hidden`, so a screen reader reads the phrase once, not letter-by-letter. `flippedChildren`/`flippedColor` are retained as opt-in Domphy extras (a different glyph/color on the back face) but BOTH default to matching the front face, so the zero-arg render is identical to upstream. jsdom has no Web Animations API, so the ripple no-ops in tests (guarded by `typeof element.animate === 'function'`); structure plus a stubbed-`animate` one-shot-ripple test cover it. Direct-source-diff fix (2026-07-05, follow-up): rewrote the interaction model to match upstream's real one-shot staggered ripple-and-return (was a CSS hover-hold with a different back-face phrase), verified visually via before/mid/after-hover screenshots.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/text-3d-flip)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/text3dFlip.ts [text3dFlip]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
