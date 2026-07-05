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

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string \| DomphyElement \| DomphyElement[]` | Text (or arbitrary content) the annotation wraps. Defaults to a short demo phrase. |
| `type` | `TextHighlighterAnnotationType` | Which hand-drawn mark to draw. Defaults to `"highlight"` (the pastel swipe-behind-text look). |
| `color` | `ThemeColor` | Theme color role for the stroke/fill. Defaults to `"highlight"`. |
| `tone` | `ElementTone` | Tone (lightness step) the color resolves at. Defaults to a light pastel (`"shift-3"`) for the `"highlight"` fill type, or a stronger, clearly-visible tone (`"shift-9"`) for every stroke-only type. |
| `strokeWidth` | `number` | Stroke thickness in px. Ignored by the `"highlight"` type, which always draws a near-text-height band. Defaults to `1.5`. |
| `duration` | `number` | How long the draw-in animation takes, in ms. Defaults to `600`. |
| `iterations` | `number` | Number of overlapping redraw passes — above 1 gives the rougher, more authentic "scribbled by hand" look. Defaults to `2`. |
| `padding` | `TextHighlighterPadding` | Gap in px between the text glyphs and the annotation stroke. Defaults to `2`. |
| `multiline` | `boolean` | Whether the annotation should be drawn as one continuous shape (`false`) or broken per visual line when the text wraps (`true`). Defaults to `true`. |
| `brackets` | `TextHighlighterBracketSide \| TextHighlighterBracketSide[]` | Which side(s) get a corner bracket mark. Only used by the `"bracket"` type. Defaults to `["left", "right"]` (flanking marks on both sides). |
| `trigger` | `"mount" \| "view"` | `"mount"` (default) draws shortly after mount; `"view"` waits until the wrapper first scrolls into the viewport, so offscreen highlights don't animate prematurely on long pages. |
| `mountDelay` | `number` | Delay before drawing, in ms, once triggered. Defaults to `100`. |
| `viewMargin` | `string` | `IntersectionObserver` `rootMargin` used when `trigger` is `"view"`. Defaults to `"-50px"`. |
| `style` | `StyleObject` | Passthrough style merged onto the wrapping span. |

::: details Implementation notes
Delegates rendering/animation to `rough-notation` (already an approved package dependency), which is a near-exact functional match for the spec: annotate(element, config) measures the target span's box, draws a rough.js path behind/around it, and reveals it via the same stroke-dasharray/stroke-dashoffset 'draw it in' technique the spec describes, with `iterations` giving the multi-pass sketchy look. All 7 RoughAnnotationType variants (highlight/underline/circle/box/bracket/strike-through/crossed-off) are exposed via the `type` prop. Colors resolve through `themeColorToken()` (design-time hex resolution, the documented escape hatch for third-party APIs that need a literal color string) rather than any hardcoded value, with tone defaulting lighter for the highlight fill vs. stronger for stroke-only types. `trigger: 'mount' | 'view'` covers the immediate-vs-scroll-into-view behavior via the same IntersectionObserver pattern used elsewhere in this package (blurFade.ts). One real gap: jsdom (this repo's test runtime) does not implement `SVGGeometryElement.prototype.getTotalLength`, which the draw-in animation depends on — verified via a standalone probe script. The component wraps both `annotate()` construction and every `.show()` call in try/catch to fail open in that case (and any other environment with an incomplete SVG implementation), so this is a defensive-only accommodation, not a behavior change in real browsers, and it mirrors the existing try/catch-around-third-party-lib pattern already used by confetti.ts in this package. Direct-source-diff fix (2026-07-05): Missing upstream's ResizeObserver-driven redraw (the underlying rough-notation SVG is sized at draw time and goes stale on any reflow), and duration/padding defaults had drifted from upstream's 600ms/2 to 500ms/5. Added the observer and realigned the defaults.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/highlighter)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/textHighlighter.ts [textHighlighter]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
