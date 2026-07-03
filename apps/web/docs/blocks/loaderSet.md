---
title: "@domphy/blocks — loaderSet"
description: "Single exported factory (`loaderSet(props)`) covering all 5 reference variants via a `variant` prop (`'simple'|'shimmer'|'compact'|'svg'|'glitch'`); zero-arg..."
---

# loaderSet

<script setup lang="ts">
import LoaderSetDemo from "../demos/blocks/loaderSet.ts?raw"
</script>

A **Loaders** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `loaderSet()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LoaderSetDemo" />

::: details Implementation notes
Single exported factory (`loaderSet(props)`) covering all 5 reference variants via a `variant` prop (`'simple'|'shimmer'|'compact'|'svg'|'glitch'`); zero-arg call renders a labeled gallery of all five, matching the package's 'call with no args -&gt; working demo' convention. Simple/compact dots bob/overlap-pulse via a per-dot sine-wave requestAnimationFrame loop (not CSS keyframes, per spec); shimmer sweeps a highlight wave across per-character spans via rAF; the SVG lightning-bolt draws itself via a static (color-free) stroke-dasharray @keyframes loop and crossfades fill between two theme colors (white/neutral shift-0 and highlight-family base, i.e. yellow) via a periodic setInterval + CSS `transition: fill` rather than a non-reactive baked-color @keyframes (keyframe step values can't hold reactive functions); glitch jitters two theme-colored duplicate text layers (success/secondary families substituting for literal green/purple, mixBlendMode: screen) on a fast setInterval. Simplification: skips the reference's 'perspective wrapper 3D wobble' on the glitch base text (translate jitter only, no 3D tilt) -- a minor decorative omission, not structural. All colors are theme-token substitutes for the reference's literal hex palette, which the spec's own researchNote says to treat as non-binding. Verified: tsc clean, doctor 0 diagnostics, all tests pass (including a leaked-timer check on unmount for every variant) -- also caught and fixed a stray non-breaking-space literal that had crept into the shimmer variant's per-character split during authoring.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/loader)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/loaders/loaderSet.ts [loaderSet]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
