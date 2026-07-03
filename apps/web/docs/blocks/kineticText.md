---
title: "@domphy/blocks — kineticText"
description: "One span per character (index-distance falloff, not CSS sibling selectors, per the spec's own clean-room guidance) plus a visually-hidden sr-only duplicate of..."
---

# kineticText

<script setup lang="ts">
import KineticTextDemo from "../demos/blocks/kineticText.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `kineticText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="KineticTextDemo" />

::: details Implementation notes
One span per character (index-distance falloff, not CSS sibling selectors, per the spec's own clean-room guidance) plus a visually-hidden sr-only duplicate of the full text (aurora-text's sr-only-text pattern) since the decorative letter spans are aria-hidden. Pointer tracking mirrors this package's own dock.ts idiom: rAF-throttled pointermove finds the nearest letter and writes font-weight/padding-inline/text-shadow imperatively per letter (continuous high-frequency effect, matching dock.ts's own exemption from the declarative style object). Declarative resting weight uses the (l)=&gt;value function-form escape hatch (thin baseline is the entire premise, no patch expresses it). Skips attaching hover listeners when matchMedia('(hover: hover)') reports no hover capability, per spec. tag is caller-configurable (h1..h6/p/div/span).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/kinetic-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/kineticText.ts [kineticText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
