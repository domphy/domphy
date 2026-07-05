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

## Props

| Prop | Type | Description |
|---|---|---|
| `imageSource` | `string` | Source image URL. Defaults to a generic inline placeholder graphic (no network fetch). |
| `columns` | `number` | Character-grid column count (resolution vs. detail). Capped at `140`. Defaults to `80`. |
| `rows` | `number` | Explicit row count. Omit to derive it from the loaded image's aspect ratio. |
| `characterSet` | `AsciiArtCharacterSet` | Named character-density ramp, sparsest-to-densest. Ignored when `characters` is set. Defaults to `"detailed"`. |
| `characters` | `string` | Custom character ramp string, ordered sparsest to densest. Overrides `characterSet`. |
| `color` | `ThemeColor` | Monochrome text color family (ignored when `colored` is `true`). Defaults to `"success"`. |
| `backgroundColor` | `ThemeColor` | Card surface tone family. Defaults to `"neutral"`. |
| `colored` | `boolean` | Tints each character with its own sampled image color instead of a flat monochrome color. Defaults to `false`. |
| `invert` | `boolean` | Inverts sampled brightness (dark image regions become dense glyphs instead of sparse ones). Defaults to `false`. |
| `revealStyle` | `AsciiArtRevealStyle` | Reveal animation played once the grid scrolls into view. Defaults to `"fade"`. |
| `revealDuration` | `number` | Total reveal duration, in ms. Defaults to `1200`. |
| `objectFit` | `AsciiArtObjectFit` | How the source image is cropped/fit into the `columns x rows` grid. Defaults to `"cover"`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Full image-&gt;character-grid pipeline: image sampled via a single scaled-down drawImage() + one getImageData() read (cover/contain object-fit, brightness + per-pixel color), mapped through a sparse-to-dense character ramp, gated behind IntersectionObserver, with fade/typewriter/matrix/instant reveal styles all implemented as plain CSS transition-delay staggering (no JS animation loop). Two minor approximations: the 'braille' character set is a density-ordered ramp of braille block glyphs, not true per-dot 2x4 braille dithering (that needs sub-cell sampling this port doesn't do). Column count is hard-capped at 140 (default 80) per the spec's own perf guidance, since each character is one DOM node.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/ascii-art)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/asciiArt.ts [asciiArt]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
