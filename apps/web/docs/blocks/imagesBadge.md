---
title: "@domphy/blocks — imagesBadge"
description: "Pure-CSS hover fan-out via nested `&:hover [data-images-badge-image='N']` selectors (no JS pointer handlers needed), matching the spec's..."
---

# imagesBadge

<script setup lang="ts">
import ImagesBadgeDemo from "../demos/blocks/imagesBadge.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `imagesBadge()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ImagesBadgeDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Badge label text. Defaults to `"Photos"`. |
| `images` | `string[]` | Up to 3 preview image URLs, revealed on hover. Defaults to 3 generated placeholders. |
| `href` | `string` | Optional link target — when set, the whole badge renders as an anchor. |
| `target` | `string` | Anchor `target`, only meaningful alongside `href`. |
| `folderColor` | `ThemeColor` | Theme color family for the folder glyph. Defaults to `"warning"` (this theme's closest built-in family to manila amber). |
| `folderIconSize` | `{ width: number; height: number }` | Folder icon size, in px. Defaults to `{ width: 32, height: 24 }`. |
| `teaserImageSize` | `{ width: number; height: number }` | Resting-state teaser thumbnail size, in px. Defaults to `{ width: 20, height: 14 }`. |
| `hoverImageSize` | `{ width: number; height: number }` | Fanned-out hover thumbnail size, in px. Defaults to `{ width: 48, height: 32 }`. |
| `hoverTranslateY` | `number` | Upward translate distance on hover, in px (negative = up). Defaults to `-35`. |
| `spreadX` | `number` | Horizontal spread distance per fan position, in px. Defaults to `20`. |
| `rotateDeg` | `number` | Fan rotation angle per position, in deg. Defaults to `15`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer badge. |

::: details Implementation notes
Pure-CSS hover fan-out via nested `&:hover [data-images-badge-image="N"]` selectors (no JS pointer handlers needed), matching the spec's confirmed-via-live-interaction behavior: folder icon + label at rest, up to 3 thumbnails overlapping behind the folder with a small peeking sliver, fanning out to alternating rotation/translate on hover. The exact resting-state peek offset and fan geometry are aesthetic approximations (the spec gives default sizes/distances but not exact positioning math), tuned to read as 'tiny sliver behind the folder' per the description. `className` (spec prop, not part of Domphy's grammar) maps to the standard `style` passthrough used throughout this package.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/images-badge)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/imagesBadge.ts [imagesBadge]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
