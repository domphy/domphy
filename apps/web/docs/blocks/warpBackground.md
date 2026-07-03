---
title: "@domphy/blocks — warpBackground"
description: "Full visual/behavior implemented in Domphy idioms: outer div with CSS perspective + a preserve-3d scene div holding 4 absolutely-positioned plane divs..."
---

# warpBackground

<script setup lang="ts">
import WarpBackgroundDemo from "../demos/blocks/warpBackground.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `warpBackground()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="WarpBackgroundDemo" />

::: details Implementation notes
Full visual/behavior implemented in Domphy idioms: outer div with CSS perspective + a preserve-3d scene div holding 4 absolutely-positioned plane divs (top/bottom/left/right), each rotated via rotateX/rotateY around its outer edge to fan into a tunnel, each painted with a two-axis repeating-linear-gradient crosshatch grid (theme shift-3 stroke token) and N absolutely-positioned gradient beam spans. Two intentional substitutions vs. the research note, both documented inline and mirroring existing repo precedent: (1) beams use a shared CSS @keyframes drift/fade loop with a per-beam randomized inline animation-delay (computed once at generation time), the same technique already used by this package's meteors.ts, instead of a JS animation-library tween per beam — the tradeoff is the loop replays the same path every cycle rather than getting a fresh random position per cycle; (2) beam hue is drawn from a rotating set of Domphy ThemeColor roles (primary/secondary/info/success/warning/error) instead of a literal 0-360 hsl() hue wheel, since raw hex/rgb/hsl color literals are forbidden on style props in this design system (the same substitution rainbowButton.ts makes for its five-hue rainbow gradient). Doctor-clean (diagnose() reports zero issues); 8 vitest assertions cover default demo shape (4 planes x 3 beams, default card content) and custom beamsPerSide/children.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/warp-background)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/warpBackground.ts [warpBackground]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
