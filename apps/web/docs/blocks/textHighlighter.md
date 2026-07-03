---
title: "@domphy/blocks — textHighlighter"
description: "Delegates rendering/animation to `rough-notation` (already an approved package dependency), which is a near-exact functional match for the spec:..."
---

# textHighlighter

<script setup lang="ts">
import TextHighlighterDemo from "../demos/blocks/textHighlighter.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `textHighlighter()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TextHighlighterDemo" />

::: details Implementation notes
Delegates rendering/animation to `rough-notation` (already an approved package dependency), which is a near-exact functional match for the spec: annotate(element, config) measures the target span's box, draws a rough.js path behind/around it, and reveals it via the same stroke-dasharray/stroke-dashoffset 'draw it in' technique the spec describes, with `iterations` giving the multi-pass sketchy look. All 7 RoughAnnotationType variants (highlight/underline/circle/box/bracket/strike-through/crossed-off) are exposed via the `type` prop. Colors resolve through `themeColorToken()` (design-time hex resolution, the documented escape hatch for third-party APIs that need a literal color string) rather than any hardcoded value, with tone defaulting lighter for the highlight fill vs. stronger for stroke-only types. `trigger: 'mount' | 'view'` covers the immediate-vs-scroll-into-view behavior via the same IntersectionObserver pattern used elsewhere in this package (blurFade.ts). One real gap: jsdom (this repo's test runtime) does not implement `SVGGeometryElement.prototype.getTotalLength`, which the draw-in animation depends on — verified via a standalone probe script. The component wraps both `annotate()` construction and every `.show()` call in try/catch to fail open in that case (and any other environment with an incomplete SVG implementation), so this is a defensive-only accommodation, not a behavior change in real browsers, and it mirrors the existing try/catch-around-third-party-lib pattern already used by confetti.ts in this package.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/highlighter)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/textHighlighter.ts [textHighlighter]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
