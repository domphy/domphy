---
title: "@domphy/blocks — safari"
description: "Full DOM/CSS implementation (flex column: toolbar + screen), not an SVG frame — chosen to keep typography on real DOM text nodes (small() patch for the..."
---

# safari

<script setup lang="ts">
import SafariDemo from "../demos/blocks/safari.ts?raw"
</script>

A **Device Mocks** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `safari()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SafariDemo" />

::: details Implementation notes
Full DOM/CSS implementation (flex column: toolbar + screen), not an SVG frame — chosen to keep typography on real DOM text nodes (small() patch for the address-bar URL) and to sidestep foreignObject entirely, in the same spirit as the spec's own note about avoiding SVG-masked video on Safari/iOS. Aspect ratio locked to 1203/753 via CSS aspect-ratio at width:100% (wrapper-driven sizing, per spec). Traffic-light dots use the same 'fill:currentColor glyph, not backgroundColor' idiom already established by this package's terminal.ts. 'simple' mode drops the traffic lights but keeps the address-bar pill (docs text was ambiguous on exactly what 'simple' strips — implementer judgment call, noted in code comments). Exact toolbar-gray/border hex values were low-confidence per the research note, so approximated with themed edge-anchor tones (shift-0/shift-2/shift-4) instead of literal colors — passes @domphy/doctor with zero diagnostics (verified via direct diagnose() call against 4 prop variants).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/safari)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/device-mocks/safari.ts [safari]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
