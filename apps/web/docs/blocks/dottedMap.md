---
title: "@domphy/blocks — dottedMap"
description: "Fully implements the described architecture: a pre-computed (non-animated) equirectangular grid of SVG dots forming a stippled world silhouette, plus a marker..."
---

# dottedMap

<script setup lang="ts">
import DottedMapDemo from "../demos/blocks/dottedMap.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `dottedMap()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DottedMapDemo" />

::: details Implementation notes
Fully implements the described architecture: a pre-computed (non-animated) equirectangular grid of SVG dots forming a stippled world silhouette, plus a marker layer supporting per-marker color/pulse overrides, a repeating CSS @keyframes radar-ping ring, and a custom overlay renderer (via SVG &lt;foreignObject&gt; + CSS clip-path circle) for e.g. avatar images — all exactly as specified, with zero stubs. The one deliberate fidelity gap, called out because it affects the VISUAL result: land/water classification uses a small, hand-authored set of ellipse approximations per continent (with a per-point pseudo-random jitter so edges look stippled rather than geometrically smooth) instead of a real geographic point-set or polygon containment test — this is the exact substitution the spec's own researchNote sanctions ('a clean-room build can substitute any lightweight equirectangular projection plus a pre-baked landmass point set... to avoid heavy geo-boundary dependencies'), but it means continent silhouettes are stylized/decorative rather than coastline-accurate. Default grid density (80 columns / 40 rows ≈ 3200 samples) is intentionally lower than the spec's illustrative ~5000-sample default, traded off for render/test performance — both counts are explicitly framed by the spec as non-normative starting points, not requirements.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/dotted-map)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/dottedMap.ts [dottedMap]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
