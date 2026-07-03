---
title: "@domphy/blocks — noiseTexture"
description: "GENUINE CORE-LEVEL BLOCKER, not a design choice: the spec's domSketch requires an SVG <feTurbulence> fractal-noise filter (chained through..."
---

# noiseTexture

<script setup lang="ts">
import NoiseTextureDemo from "../demos/blocks/noiseTexture.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `noiseTexture()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="NoiseTextureDemo" />

::: details Implementation notes
GENUINE CORE-LEVEL BLOCKER, not a design choice: the spec's domSketch requires an SVG &lt;feTurbulence&gt; fractal-noise filter (chained through feColorMatrix/feComponentTransfer). Verified in packages/core/src/constants/SvgTags.ts that feTurbulence, feComponentTransfer, and feFuncR/G/B/A are ABSENT from the `SvgTags` allowlist that `ElementNode._createDOMNode` consults to decide `document.createElementNS(svgNS, tag)` vs. plain `document.createElement(tag)` — even though those exact tag names ARE present in `HtmlTags` (so doctor's unknown-tag rule stays silent and the element 'looks' fine, but at runtime it renders as an inert, unnamespaced HTMLUnknownElement in a real browser, and the SVG filter produces zero noise). This is a real, verifiable gap in @domphy/core today, not an approximation choice on my part — confirmed by reading both constant files directly. Per this port's own escape-hatch rule ('never fabricate a false ported status'), I did not modify @domphy/core (out of scope for a packages/blocks task; a shared package with wide blast radius) and instead reimplemented the component as a &lt;canvas&gt; grayscale grain generator with an equivalent public API (frequency/octaves/slope/noiseOpacity/seed) and the same visual result (static, deterministic-per-seed, desaturated speckled grain, mix-blend-mode:multiply over the content beneath, matching the spec's 'reads as a texture multiply' wording). Canvas draw is guarded with `if (!context) return` — the exact same jsdom-canvas-unavailable fallback pattern already used by iconCloud()/particles() in this package, confirmed by reading their source. A literal SVG-filter version becomes possible with a one-line addition to @domphy/core's `SvgTags` array (recommend as a follow-up, out of this task's scope). doctor CLI: 0 diagnostics on the canvas-based implementation actually shipped.

Status: **partial** · Reference: [Magic UI original](https://magicui.design/docs/components/noise-texture)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/noiseTexture.ts [noiseTexture]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
