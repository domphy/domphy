---
title: "@domphy/blocks — macbookScroll"
description: "Full behavioral structure is implemented: position:sticky pinned scroll range, two sequential rAF-lerped phases (lid rotateX from -90deg to -8deg, then screen..."
---

# macbookScroll

<script setup lang="ts">
import MacbookScrollDemo from "../demos/blocks/macbookScroll.ts?raw"
</script>

A **Scroll** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `macbookScroll()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="MacbookScrollDemo" />

::: details Implementation notes
Full behavioral structure is implemented: position:sticky pinned scroll range, two sequential rAF-lerped phases (lid rotateX from -90deg to -8deg, then screen image scale 1x to 1.55x bleeding past the bezel via overflow:visible), a literal 6-row QWERTY keyboard built from ~70 individual key elements plus a trackpad and a customizable bottom-left sticker/badge, all above a heading. Marked 'partial' purely on VISUAL fidelity, not behavior: the shell is built from plain rounded divs/theme-color fills rather than a hand-drawn/illustrated vector shell with the metallic highlight shading the reference has, and the exact rotation/scale numeric ranges are approximated per the spec's own researchNote ('low confidence on precise degree/scale values, implementer should tune to taste') -- there was no real value to diff against. Keycap/trackpad/sticker colors are intentionally fixed device-material shades that don't track the host page's ambient theme (documented via _doctorDisable on tone-background-inherit, same precedent as this package's lampEffect.ts glow elements).

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/macbook-scroll)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/scroll/macbookScroll.ts [macbookScroll]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
