---
title: "@domphy/blocks — android"
description: "Same DOM-frame technique as iphone.ts (percentage border-radius/inset instead of an authored SVG path) but, per the spec's explicit sizing distinction, the..."
---

# android

<script setup lang="ts">
import AndroidDemo from "../demos/blocks/android.ts?raw"
</script>

A **Device Mocks** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `android()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AndroidDemo" />

::: details Implementation notes
Same DOM-frame technique as iphone.ts (percentage border-radius/inset instead of an authored SVG path) but, per the spec's explicit sizing distinction, the root element takes literal width/height props (default 433x882, in px) instead of only being wrapper-driven — verified in tests via generateCSS() output. Front camera is a punch-hole circle (not a Dynamic Island); volume rocker (2 buttons) + power button both sit on the right edge, per the spec's 'one vertical edge' description (a common flagship layout — upstream's exact button placement/colors were noted as low-confidence in the research note). Decorative shapes use the same fill:currentColor glyph idiom as iphone.ts/terminal.ts. Video overlay is a plain DOM &lt;video&gt;, not an SVG mask, for the same Safari/iOS clipping reason. Verified doctor-clean (zero diagnostics) across default/custom-size/image/video prop variants.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/android)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/device-mocks/android.ts [android]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
