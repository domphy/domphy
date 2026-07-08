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

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `DomphyElement[]` | Repeating unit rendered inside the strip. Defaults to a set of demo review chips. |
| `orientation` | `"horizontal" \| "vertical"` | Scroll axis. Defaults to "horizontal". |
| `reverse` | `boolean` | Flips the scroll direction (right-to-left becomes left-to-right, etc.). Defaults to false. |
| `pauseOnHover` | `boolean` | Freezes the animation on pointer-hover, resuming from the same position on pointer-leave. Defaults to false. |
| `duration` | `number` | Seconds per loop. Defaults to 40. |
| `repeat` | `number` | How many times the item set is duplicated inside the track. Defaults to 4, minimum 2. |
| `gap` | `number` | Gap between items, in `themeSpacing` units. Defaults to 4. |
| `fade` | `boolean` | Opt-in gradient edge-fade scrims. Upstream's Marquee renders none — the fade in Magic UI's demo comes from the demo-page wrapper, not the component. Defaults to false. |
| `style` | `StyleObject` | Passthrough style merged onto the outer (overflow-hidden) container. |
| `trackStyle` | `StyleObject` | Passthrough style merged onto the scrolling track. |

::: details Implementation notes
CSS keyframe loop (translate by -100%/repeat, linear infinite) with duplicated groups (default repeat=4), gradient edge-fade overlays, pauseOnHover via a nested :hover selector, and orientation/reverse support. Default demo renders 5 testimonial 'chips' (avatar+name+username+quote) built from existing @domphy/ui patches. Not implemented: the '3D/perspective-tilted variant' mentioned only as a researchNote style flourish — treated as out of scope for the core primitive; callers can layer their own perspective/rotate transform via the style/trackStyle passthrough. Direct-source-diff fix (2026-07-05): The whole track animated by -100%/repeat, which leaves a visible seam at the loop point — upstream translates each duplicated GROUP by its own pitch (calc(-100% - gap)) for a truly seamless loop. Switched to the per-group technique.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/marquee)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/marquee.ts [marquee]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
