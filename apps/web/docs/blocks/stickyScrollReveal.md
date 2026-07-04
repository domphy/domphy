---
title: "@domphy/blocks — stickyScrollReveal"
description: "Active section is picked by nearest-title-to-scroll-box-center (rAF-debounced getBoundingClientRect scan) rather than an IntersectionObserver root-margin band..."
---

# stickyScrollReveal

<script setup lang="ts">
import StickyScrollRevealDemo from "../demos/blocks/stickyScrollReveal.ts?raw"
</script>

A **Scroll** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `stickyScrollReveal()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="StickyScrollRevealDemo" />

::: details Implementation notes
Active section is picked by nearest-title-to-scroll-box-center (rAF-debounced getBoundingClientRect scan) rather than an IntersectionObserver root-margin band -- simpler, no observer needed, and degenerates sanely under jsdom (all rects 0 -&gt; first item wins deterministically). The panel is N pre-rendered, absolutely-stacked color/content layers whose opacity cross-fades via CSS transition on activeIndex change (a discrete State&lt;number&gt;), matching the spec's 'snap to nearest, then animate the swap' behavior rather than continuous scroll-scrubbing. Panel background color varies by ThemeColor family (primary/success/info/secondary cycle) at a fixed dark dataTone floor. The root element is its own bounded-height (`scrollHeightUnits`, default 130 themeSpacing units), `overflow-y: auto` scroll box -- matching upstream's own bounded container -- rather than a document-scroll-based implementation: `position: sticky` only ever sticks relative to its nearest scrolling ancestor, so relying on the page/window scrolling silently breaks the moment this is mounted inside any ancestor that itself establishes a scroll container.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/sticky-scroll-reveal)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/scroll/stickyScrollReveal.ts [stickyScrollReveal]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
