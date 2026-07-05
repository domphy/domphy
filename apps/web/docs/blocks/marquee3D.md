---
title: "@domphy/blocks — marquee3D"
description: "Full behavior implemented, pure CSS (no animation-frame loop, per the spec's own animation note): a fixed perspective()+rotateX/rotateY/rotateZ tilt on the..."
---

# marquee3D

<script setup lang="ts">
import Marquee3DDemo from "../demos/blocks/marquee3D.ts?raw"
</script>

A **Effects 3D** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `marquee3D()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Marquee3DDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `images` | `Array&lt;string \| Marquee3DImage&gt;` | Pool of images distributed round-robin across the columns. Defaults to 12 generated placeholders. |
| `columns` | `number` | Number of vertical columns. Defaults to `4`. |
| `overlay` | `DomphyElement \| DomphyElement[] \| null` | Overlay content rendered flat (un-rotated) above the tilted grid — the hero-banner heading variant. Pass `null` to omit it entirely. Defaults to a short demo headline. |
| `showGridLines` | `boolean` | Shows the faint overlay grid-line decoration co-tilted with the image plane. Defaults to `true`. |
| `lineOffsetX` | `number` | Horizontal spacing between grid lines, in px (matches the reference component's own documented default). Defaults to `200`. |
| `lineOffsetY` | `number` | Vertical spacing between grid lines, in px (matches the reference component's own documented default). Defaults to `150`. |
| `duration` | `number` | Seconds per full column loop. Defaults to `36`. |
| `gap` | `number` | Gap between stacked tiles within a column, in `themeSpacing` units. Defaults to `3`. |
| `tileHeight` | `number` | Each tile's rendered height, in `themeSpacing` units. Defaults to `56`. |
| `areaHeight` | `number` | Overall grid area height, in `themeSpacing` units. Defaults to `140`. |
| `rotateXDegrees` | `number` | Tilt rotation around the X axis, in deg. Defaults to `55`. |
| `rotateYDegrees` | `number` | Tilt rotation around the Y axis, in deg. Defaults to `0`. |
| `rotateZDegrees` | `number` | Tilt rotation around the Z axis, in deg. Defaults to `-45`. |
| `perspectiveDistance` | `number` | CSS `perspective()` distance, in px. Defaults to `1400`. |
| `className` | `string` | Extra class name merged onto the outer perspective container's native `class` attribute. |
| `imageClassName` | `string` | Extra class name merged onto every image tile's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the outer perspective container. |

::: details Implementation notes
Full behavior implemented, pure CSS (no animation-frame loop, per the spec's own animation note): a fixed perspective()+rotateX/rotateY/rotateZ tilt on the grid wrapper, per-column infinite loops using the same 'translate by exactly one repeated group length' trick this package's marquee.ts uses, alternating columns via animation-direction:reverse plus a small negative animation-delay stagger, an optional co-tilted grid-line decoration layer (a plain descendant of the transformed wrapper, so it tilts for free with no extra transform needed), and an optional un-rotated hero heading overlay. The documented upstream grid-line defaults (200px horizontal / 150px vertical) are preserved as the prop defaults but converted to themeSpacing() units internally so the component never emits literal px in its style objects. Exact tilt angles (rotateX 55°/rotateZ -45°) are this implementer's reasonable choice for a classic isometric read, since the spec didn't mandate specific degrees.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/3d-marquee)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/effects-3d/marquee3D.ts [marquee3D]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
