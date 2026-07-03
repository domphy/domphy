---
title: "@domphy/blocks — meteors"
description: "Fully functional pure-CSS port matching the spec's defaults (count 20, angle 215deg, delay range 0.2-1.2s, duration range 2-10s)."
---

# meteors

<script setup lang="ts">
import MeteorsDemo from "../demos/blocks/meteors.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `meteors()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="MeteorsDemo" />

::: details Implementation notes
Fully functional pure-CSS port matching the spec's defaults (count 20, angle 215deg, delay range 0.2-1.2s, duration range 2-10s). One accepted CSS-only tradeoff, explicitly allowed by the spec itself ("No JS animation loop is required"): because a single shared `@keyframes` rule drives every meteor's infinite loop, each meteor replays the exact same left-offset/path every cycle — only the initial `animation-delay`/`animation-duration` are randomized once at generation time, not a fresh random position every loop iteration (that would require a JS-driven rAF respawn loop instead of pure CSS). Travel distance uses `vmax` (viewport-relative) rather than a fixed px/em length so one shared keyframe reliably clears any container size.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/meteors)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/meteors.ts [meteors]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
