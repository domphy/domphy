---
title: "@domphy/blocks — heroHighlight"
description: "Two-layer pure-CSS dot grid (background-image radial-gradient tiling) matches the spec's domSketch exactly: a faint base layer plus a brighter overlay layer..."
---

# heroHighlight

<script setup lang="ts">
import HeroHighlightDemo from "../demos/blocks/heroHighlight.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `heroHighlight()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="HeroHighlightDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[]` | Hero content rendered above the dot-grid/spotlight background. Defaults to a short demo headline. |
| `containerClassName` | `string` | Extra class name merged onto the outer section's native `class` attribute. |
| `className` | `string` | Extra class name merged onto the inner content wrapper's native `class` attribute. |
| `dotSpacing` | `number` | Grid gap between dots, in px. Defaults to `22`. |
| `dotColor` | `ThemeColor` | Theme color family for the faint base dot grid. Defaults to `"neutral"`. |
| `spotlightColor` | `ThemeColor` | Theme color family for the brighter spotlight-revealed dot grid. Defaults to `"primary"`. |
| `spotlightRadius` | `number` | Spotlight circle radius, in px. Defaults to `220`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer section. |

::: details Implementation notes
Two-layer pure-CSS dot grid (background-image radial-gradient tiling) matches the spec's domSketch exactly: a faint base layer plus a brighter overlay layer masked to a soft circle bound to two CSS custom properties (--hero-highlight-x/-y) written imperatively on pointermove for 1:1, no-easing cursor tracking -- no animation loop needed, as the spec itself calls for. Also exports a secondary heroHighlightMark(props) sub-piece (children/className/color/sweepDuration) for the marked-phrase highlighter bar, which motion()-tweens width 0%-&gt;100% once on mount (a one-shot sweep, never replayed since no hover listener is attached) -- this satisfies the spec's own two-piece prop table (HeroHighlight wrapper + Highlight sub-piece) even though the task listed only 'heroHighlight' as the exportName. Exact dot color/opacity and the highlighter's accent color are this implementation's own reasonable defaults (light neutral dot grid, warm 'warning'-role accent bar) since the upstream demo was client-rendered and not pixel-inspectable, per the task's own researchNote -- low-to-moderate confidence on precise color tokens, high confidence on the two-layer spotlight + one-shot marker-sweep mechanism.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/hero-highlight)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/heroHighlight.ts [heroHighlight]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
