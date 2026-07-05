---
title: "@domphy/blocks — backlight"
description: "Full visual/behavior implemented using the research note's primary (higher-fidelity) technique rather than its DOM-cloning fallback: a hidden 0x0 <svg> defines..."
---

# backlight

<script setup lang="ts">
import BacklightDemo from "../demos/blocks/backlight.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backlight()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BacklightDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement` | The single media element to wrap — image, video, or SVG. Defaults to a small colorful placeholder graphic (so the glow is visible out of the box). |
| `blur` | `number` | Gaussian blur `stdDeviation` controlling how soft/wide the glow spreads. Defaults to `20`. |
| `style` | `StyleObject` | Passthrough style merged onto the media wrapper (the filtered element). |

::: details Implementation notes
Full visual/behavior implemented using the research note's primary (higher-fidelity) technique rather than its DOM-cloning fallback: a hidden 0x0 &lt;svg&gt; defines a &lt;filter&gt; graph (feGaussianBlur on SourceGraphic -&gt; feColorMatrix saturate=4 -&gt; feComposite operator=over recompositing SourceGraphic back on top), applied to a wrapper div around the single media child via CSS `filter: url(#id)` — the same hidden-defs-plus-url-reference pattern this package's morphingText.ts already uses for its 'goo' filter. Because the filter's SourceGraphic is literally whatever the wrapper already rendered, the glow color always exactly matches the wrapped media with no color prop of its own, and no DOM node is duplicated. Purely static (no animation), matching the spec. filter x/y/width/height are widened to -50%/-50%/200%/200% so a large blur stdDeviation isn't clipped at the SVG default filter region. Doctor-clean; 2 vitest assertions cover the default demo (filter def + generated CSS references it) and swapping in custom media (a &lt;video&gt;) in place of the default placeholder image.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/backlight)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/backlight.ts [backlight]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
