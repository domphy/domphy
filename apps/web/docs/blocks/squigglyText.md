---
title: "@domphy/blocks — squigglyText"
description: "Full literal port of the domSketch: N pre-built SVG <filter> defs (each a feTurbulence fractalNoise generator + feDisplacementMap, varying seed/scale per step)..."
---

# squigglyText

<script setup lang="ts">
import SquigglyTextDemo from "../demos/blocks/squigglyText.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `squigglyText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SquigglyTextDemo" />

::: details Implementation notes
Full literal port of the domSketch: N pre-built SVG &lt;filter&gt; defs (each a feTurbulence fractalNoise generator + feDisplacementMap, varying seed/scale per step) live in a hidden inline &lt;svg&gt;, and a setInterval swaps which filter id is applied via the text wrapper's CSS `filter` property every stepDuration ms, cycling and looping — the stepped/stop-motion jitter the spec describes, not a smooth interpolation. `scale` alternates between the full value and a reduced fraction every other step per the spec's own note. REQUIRED A GENUINE CORE FIX (not a workaround): packages/core/src/constants/SvgTags.ts was missing feTurbulence/feDisplacementMap (their attribute typings already existed in HtmlAttributeMap.ts, so the doctor's unknown-tag rule stayed silent even though the elements would have rendered unnamespaced and inert in a real browser) — confirmed by direct inspection, fixed additively (also added the sibling feComponentTransfer/feFuncR/G/B/A tags for completeness). Also found CamelAttributes.ts was missing baseFrequency/numOctaves/xChannelSelector/yChannelSelector (literal-camelCase SVG presentation attributes, not kebab-case) and added those too, or my JS-side attributes would have rendered as the wrong DOM attribute names. Both fixes rebuilt and packages/core's own test suite (156 tests) still passes. Verified via a debug script that the rendered filter/feTurbulence/feDisplacementMap elements are correctly SVG-namespaced. This also resolves the exact gap noiseTexture.ts (pre-existing sibling file) had documented and worked around with a canvas substitute — that file was left untouched (out of this task's scope) but the underlying core gap it flagged is now fixed. Doctor-clean (0 diagnostics) and 4/4 tests pass. Per the task's own researchNote, the reference URL's actual content (glyph-wobble via SVG filters) does not match the task's short label ('squiggly animated underline'); built to match the linked domSketch/spec, not the mismatched label.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/squiggly-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/squigglyText.ts [squigglyText]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
