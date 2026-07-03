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

::: details Implementation notes
Full clean-room reimplementation built on @domphy/ui's own motion() WAAPI patch (no Framer Motion, no React), mirroring the same State-driven hidden-&gt;visible keyframe pattern already used by this package's terminal() block. Supports direction (up/down/left/right, default 'down' = starts offset below and slides up into place, matching the spec's stated semantics), offset (px, default 6), blur (px, default 6), duration (ms, default 400) and delay (ms). trigger 'mount' (default) reveals shortly after mount; trigger 'view' uses a real IntersectionObserver with a configurable viewMargin (default '-50px', matching the spec's researchNote) and fires the reveal exactly once, never reversing — the observer disconnects itself after first intersection. Falls open (reveals immediately) if IntersectionObserver is unavailable. keyframes prop lets callers fully override the hidden/visible frames for advanced cases; inline switches the wrapper to inline-block; style passes through onto the wrapper. Children are rendered completely unchanged inside a single plain div wrapper, per the spec's domSketch. Verifying this component's node.remove() path (no `exit` frame =&gt; motion()'s _onBeforeRemove completes synchronously) surfaced and led to fixing the @domphy/core removal-hook bug described in the animatedThemeToggler entry above, which this component also relies on for crash-free root-level removal.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/blur-fade)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/blurFade.ts [blurFade]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
