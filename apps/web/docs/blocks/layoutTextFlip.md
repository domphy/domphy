---
title: "@domphy/blocks — layoutTextFlip"
description: "Full behavioral port of the documented props (text/words/duration): a fixed lead-in phrase plus a rotating word in an edge-anchored dataTone badge."
---

# layoutTextFlip

<script setup lang="ts">
import LayoutTextFlipDemo from "../demos/blocks/layoutTextFlip.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `layoutTextFlip()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LayoutTextFlipDemo" />

::: details Implementation notes
Full behavioral port of the documented props (text/words/duration): a fixed lead-in phrase plus a rotating word in an edge-anchored dataTone badge. Word crossfade reuses this package's existing wordRotate.ts idiom (single-item reactive keyed list + motion() enter/exit slide+fade). The badge's own width smoothly tweens via a SEPARATE motion() instance driven by a reactive State&lt;MotionKeyframe&gt; — because motion() replays a single-keyframe WAAPI animation, the browser implicitly animates FROM the badge's current rendered width, producing the spec's 'eased tween from the old word's width to the new word's' without any FLIP/layout-animation library. Target widths are measured via an offscreen canvas.measureText() call against the badge's own resolved font (read once via getComputedStyle) rather than a DOM measure round-trip, avoiding any mount-order dependency; the very first word's width is set directly (no animation) to avoid a layout jump. FIDELITY GAP (documented in-file and per the task's own researchNote): the upstream docs page only exposed the props table, not the rendered demo's computed badge styling, so the badge's border/background/shadow are this implementation's own reasonable design choice (this package's standard edge-anchored dataTone chip convention), not a confirmed 1:1 visual match. Doctor-clean (0 diagnostics) and 4/4 tests pass.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/layout-text-flip)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/layoutTextFlip.ts [layoutTextFlip]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
