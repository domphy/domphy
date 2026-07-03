---
title: "@domphy/blocks — marquee"
description: "CSS keyframe loop (translate by -100%/repeat, linear infinite) with duplicated groups (default repeat=4), gradient edge-fade overlays, pauseOnHover via a..."
---

# marquee

<script setup lang="ts">
import MarqueeDemo from "../demos/blocks/marquee.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `marquee()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="MarqueeDemo" />

::: details Implementation notes
CSS keyframe loop (translate by -100%/repeat, linear infinite) with duplicated groups (default repeat=4), gradient edge-fade overlays, pauseOnHover via a nested :hover selector, and orientation/reverse support. Default demo renders 5 testimonial 'chips' (avatar+name+username+quote) built from existing @domphy/ui patches. Not implemented: the '3D/perspective-tilted variant' mentioned only as a researchNote style flourish — treated as out of scope for the core primitive; callers can layer their own perspective/rotate transform via the style/trackStyle passthrough.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/marquee)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/marquee.ts [marquee]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
