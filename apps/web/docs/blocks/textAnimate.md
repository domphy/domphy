---
title: "@domphy/blocks — textAnimate"
description: "Split modes (character/word/line/text), 10 animation presets (fade/blur/slide/scale variants), per-mode default stagger (30ms char / 50ms word / 60ms..."
---

# textAnimate

<script setup lang="ts">
import TextAnimateDemo from "../demos/blocks/textAnimate.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `textAnimate()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TextAnimateDemo" />

::: details Implementation notes
Split modes (character/word/line/text), 10 animation presets (fade/blur/slide/scale variants), per-mode default stagger (30ms char / 50ms word / 60ms line+whole), 300ms default duration, start delay, startOnView, once, and the accessibility toggle are all implemented. Hand-rolled on the raw Web Animations API (guarded by `typeof element.animate === 'function'`, same convention as this package's other WAAPI-driven blocks) rather than the shared `motion()` patch, specifically so the optional exit transition can use an independently-computed, correctly-reversed per-segment delay (motion() only exposes one shared delay for both enter and exit). 'className'/'segment className' from the spec are exposed as Domphy's own `style`/`segmentStyle` passthrough props instead -- this framework has no CSS-class concept, and every other block in this package makes the same substitution. 'line' mode splits on literal `\n` in the text string; there is no browser line-wrap measurement pass, so soft-wrap-aware line splitting is out of scope (consistent with how other blocks in this package avoid layout-measurement-dependent features). 'Replay whenever the text content changes' is achieved by typing `text` as `ValueOrState&lt;string&gt;` and keying every segment off the live text value, so a text change produces fresh keys, a full remount, and a fresh entrance stagger for free. Accessibility uses the sr-only-text + aria-hidden-decoration pattern (matches the spec's own DOM sketch). jsdom (the test runtime) has no Web Animations API, so entrance/exit tweens no-op there; one test stubs `HTMLElement.prototype.animate` to verify the enter tween is actually invoked.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/text-animate)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/textAnimate.ts [textAnimate]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
