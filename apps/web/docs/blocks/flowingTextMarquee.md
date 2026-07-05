---
title: "@domphy/blocks — flowingTextMarquee"
description: "SVG <textPath> along a wavy/looping guide curve, scrolled continuously via a native SMIL <animate> on startOffset (no JS timers for the common case); supports..."
---

# flowingTextMarquee

<script setup lang="ts">
import FlowingTextMarqueeDemo from "../demos/blocks/flowingTextMarquee.ts?raw"
</script>

A **Labs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `flowingTextMarquee()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="FlowingTextMarqueeDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `phrases` | `string[]` | Sentence(s) to flow along the curve. When more than one is given they cycle automatically. |
| `phraseDurationMs` | `number` | How long each phrase is shown before cycling to the next, in ms. Only used when `phrases.length &gt; 1`. Defaults to `7000`. |
| `pathData` | `string` | Raw SVG path data for the guide curve. Defaults to a wide, open wavy loop. |
| `viewBox` | `string` | Matches `pathData`'s coordinate space. Defaults to `"0 0 1200 480"`. |
| `scrollDurationSeconds` | `number` | One full scroll loop, in seconds. Defaults to `26`. |
| `color` | `ThemeColor` | Text color family. Defaults to `"neutral"`. |
| `pauseOnHover` | `boolean` | Pauses the scroll while the pointer is over the section. Defaults to `false`. |
| `showGuidePath` | `boolean` | Strokes the guide curve itself instead of hiding it. Defaults to `false`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
SVG &lt;textPath&gt; along a wavy/looping guide curve, scrolled continuously via a native SMIL &lt;animate&gt; on startOffset (no JS timers for the common case); supports multi-phrase cycling, pause-on-hover (via SVGSVGElement.pauseAnimations()), and an optional visible guide stroke. Curve geometry and scroll speed are original/best-guess, matching the spec's own 'moderate confidence' research note (the live demo could not be observed). While implementing this, found and worked around a real @domphy/core bug: attributeName/repeatCount/startOffset are case-sensitive SVG attributes not on core's CamelAttributes allowlist, so declaring them as normal props silently kebab-cases them into invalid SVG (attribute-name/repeat-count) that a real browser ignores -- fixed locally by setting them imperatively via setAttribute in _onMount, without touching the shared core package. Also added an aria-hidden svg + sr-only text-duplicate split (matching this package's auroraText.ts convention) since curved SVG text is not screen-reader-friendly.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/labs/wispr-flow-text-animation)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/labs/flowingTextMarquee.ts [flowingTextMarquee]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
