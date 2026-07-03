---
title: "@domphy/blocks — asciiArt"
description: "Full image->character-grid pipeline: image sampled via a single scaled-down drawImage() + one getImageData() read (cover/contain object-fit, brightness +..."
---

# asciiArt

<script setup lang="ts">
import AsciiArtDemo from "../demos/blocks/asciiArt.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `asciiArt()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AsciiArtDemo" />

::: details Implementation notes
Full image-&gt;character-grid pipeline: image sampled via a single scaled-down drawImage() + one getImageData() read (cover/contain object-fit, brightness + per-pixel color), mapped through a sparse-to-dense character ramp, gated behind IntersectionObserver, with fade/typewriter/matrix/instant reveal styles all implemented as plain CSS transition-delay staggering (no JS animation loop). Two minor approximations: the 'braille' character set is a density-ordered ramp of braille block glyphs, not true per-dot 2x4 braille dithering (that needs sub-cell sampling this port doesn't do). Column count is hard-capped at 140 (default 80) per the spec's own perf guidance, since each character is one DOM node.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/ascii-art)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/asciiArt.ts [asciiArt]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
