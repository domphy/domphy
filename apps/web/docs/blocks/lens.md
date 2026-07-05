---
title: "@domphy/blocks — lens"
description: "Full follow-cursor and static/controlled modes as specified, with the exact coordinate math from the spec's research note (zoom layer scaled about its own..."
---

# lens

<script setup lang="ts">
import LensDemo from "../demos/blocks/lens.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `lens()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LensDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement` | Content to magnify — image or arbitrary element. Defaults to a generic placeholder image. |
| `zoomFactor` | `number` | Magnification multiplier. Defaults to 1.3. |
| `lensSizeUnits` | `number` | Circular lens diameter, in `themeSpacing` units (≈170px at the default). Defaults to 42.5. |
| `isStatic` | `boolean` | Pins the lens at `position` instead of following the pointer (useful for click-to-reveal, touch, or fully programmatic control). Defaults to false. |
| `position` | `ValueOrState&lt;LensPosition&gt;` | Coordinate (px, relative to the content's own top-left) used when `isStatic` is true. Accepts a `State` for reactive/programmatic control. Defaults to a point near the top-left of the content. |
| `lensColor` | `ThemeColor` | Tint/border color for the lens ring. Defaults to `"primary"`. |
| `ariaLabel` | `string` | — |
| `duration` | `number` | Seconds — smoothing speed for lens movement/opacity transitions. Defaults to 0.1. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full follow-cursor and static/controlled modes as specified, with the exact coordinate math from the spec's research note (zoom layer scaled about its own origin then translated by (lensRadius - x*zoom, lensRadius - y*zoom)), a circular clipped overlay with a themed ring/shadow, and a short eased CSS transition for the glide/fade. The magnified duplicate is produced via `element.cloneNode(true)` of the already-rendered base content (done once, imperatively, in `_onMount`) rather than mounting a second Domphy tree from the same `children` object, since a Domphy element is bound to one DOM node and can't be rendered twice in one tree — this works for arbitrary content (image or nested markup) per the spec's scope. Static/controlled mode is wired through Domphy's own reactive `effect()`/`State` (a `State&lt;{x,y}&gt;` passed as `props.position` re-positions the lens declaratively), while follow mode uses imperative mousemove writes, matching this package's established convention that high-frequency pointer tracking is imperative while externally-driven state is reactive.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/lens)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/lens.ts [lens]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
