---
title: "@domphy/blocks — iphone"
description: "Device silhouette approximated with nested absolutely-positioned divs/spans (percentage-based border-radius, inset, and button placement) rather than a..."
---

# iphone

<script setup lang="ts">
import IphoneDemo from "../demos/blocks/iphone.ts?raw"
</script>

A **Device Mocks** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `iphone()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="IphoneDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `src` | `string` | Screenshot shown in the screen area. |
| `videoSrc` | `string` | Video shown in the screen area, rendered as a DOM overlay (not an SVG mask) to avoid a known Safari/iOS video-clipping bug when video sits inside a masked SVG tree. |
| `alt` | `string` | Accessible label for the screen content (image alt text / video description). |
| `style` | `StyleObject` | — |

::: details Implementation notes
Device silhouette approximated with nested absolutely-positioned divs/spans (percentage-based border-radius, inset, and button placement) rather than a hand-authored SVG bezier path — border-radius as a CSS percentage scales proportionally with the fixed 433/882 aspect ratio, giving the same visual effect as a locked vector path without needing exact upstream corner-radius numbers (which the research note flagged as unavailable/low-confidence anyway). Dynamic Island and the 4 side-button notches (mute switch, 2x volume, power) are solid SVG glyphs colored via `fill:currentColor` + `color`, matching this package's existing terminal.ts trafficLightDot idiom — avoids the doctor's missing-color rule without any _doctorDisable escape hatch. Video renders as a plain absolutely-positioned DOM &lt;video&gt; sibling clipped by the screen div's own overflow:hidden (not a foreignObject/SVG mask), honoring the spec's explicit Safari/iOS video-clipping workaround. Sized entirely by the wrapper (width:100%), per spec. Verified doctor-clean (zero diagnostics) across default/image/video prop variants.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/iphone)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/device-mocks/iphone.ts [iphone]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
