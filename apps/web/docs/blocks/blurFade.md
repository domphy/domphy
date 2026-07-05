---
title: "@domphy/blocks — blurFade"
description: "Full clean-room reimplementation built on @domphy/ui's own motion() WAAPI patch (no Framer Motion, no React), mirroring the same State-driven hidden->visible..."
---

# blurFade

<script setup lang="ts">
import BlurFadeDemo from "../demos/blocks/blurFade.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `blurFade()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BlurFadeDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[]` | Content to reveal. A single element or a list — passed through unchanged inside the animated wrapper. Defaults to a small demo block. |
| `direction` | `BlurFadeDirection` | Direction the content *travels* as it reveals — `"down"` (the default) starts the content offset above its final position and it slides down into place; `"up"` starts below and slides up; `"left"` starts to the right and slides left; `"right"` starts to the left and slides right. |
| `offset` | `number` | How far the content starts offset, in px. Defaults to `6`. |
| `blur` | `number` | Starting blur radius, in px. Defaults to `6`. |
| `duration` | `number` | Reveal duration in ms. Defaults to `400`. |
| `delay` | `number` | Delay before the reveal starts, in ms (once triggered). Defaults to `0`. |
| `trigger` | `"mount" \| "view"` | `"mount"` (default) plays shortly after the wrapper mounts; `"view"` waits until the wrapper first scrolls into the viewport, then plays once and never reverses. |
| `viewMargin` | `string` | `IntersectionObserver` `rootMargin` used when `trigger` is `"view"`. Defaults to `"-50px"` (fires slightly before the element is fully visible). Only used when `trigger === "view"`. |
| `keyframes` | `BlurFadeKeyframePair` | Fully custom `hidden`/`visible` keyframes, overriding `direction`/`offset`/`blur` entirely. |
| `inline` | `boolean` | Renders the wrapper as `inline-block` instead of the default `block`, for revealing inline content without breaking its flow. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full clean-room reimplementation built on @domphy/ui's own motion() WAAPI patch (no Framer Motion, no React), mirroring the same State-driven hidden-&gt;visible keyframe pattern already used by this package's terminal() block. Supports direction (up/down/left/right, default 'down' = starts offset below and slides up into place, matching the spec's stated semantics), offset (px, default 6), blur (px, default 6), duration (ms, default 400) and delay (ms). trigger 'mount' (default) reveals shortly after mount; trigger 'view' uses a real IntersectionObserver with a configurable viewMargin (default '-50px', matching the spec's researchNote) and fires the reveal exactly once, never reversing — the observer disconnects itself after first intersection. Falls open (reveals immediately) if IntersectionObserver is unavailable. keyframes prop lets callers fully override the hidden/visible frames for advanced cases; inline switches the wrapper to inline-block; style passes through onto the wrapper. Children are rendered completely unchanged inside a single plain div wrapper, per the spec's domSketch. Verifying this component's node.remove() path (no `exit` frame =&gt; motion()'s _onBeforeRemove completes synchronously) surfaced and led to fixing the @domphy/core removal-hook bug described in the animatedThemeToggler entry above, which this component also relies on for crash-free root-level removal. Direct-source-diff fix (2026-07-05): The offset-per-direction math was inverted for all four directions (e.g. the default "down" direction was sliding up instead of down) — fixed all four offsets to match upstream's actual travel direction.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/blur-fade)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/blurFade.ts [blurFade]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
