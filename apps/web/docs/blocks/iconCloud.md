---
title: "@domphy/blocks — iconCloud"
description: "Full 2D-canvas sphere-of-icons implementation as the spec calls for: golden-angle Fibonacci sphere point distribution (no pole clumping), idle auto-rotation,..."
---

# iconCloud

<script setup lang="ts">
import IconCloudDemo from "../demos/blocks/iconCloud.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `iconCloud()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="IconCloudDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `icons` | `IconCloudItem[]` | Icons distributed evenly over the sphere. Defaults to 20 generic hand-authored glyphs. |
| `size` | `number` | Square canvas/container size, in px. Defaults to 380. |
| `autoRotateSpeed` | `number` | Idle auto-rotation angular speed, radians/frame. Defaults to 0.003. |
| `dragSensitivity` | `number` | Drag sensitivity — radians of rotation per px of pointer movement. Defaults to 0.006. |
| `friction` | `number` | Inertia decay factor applied to angular velocity each frame after release (0–1; closer to 1 coasts longer). Defaults to 0.95. |
| `iconScaleRange` | `[number, number]` | Icon render size range in px, `[nearest, farthest]`. Defaults to `[42, 14]`. |
| `iconOpacityRange` | `[number, number]` | Icon opacity range, `[nearest, farthest]`. Defaults to `[1, 0.25]`. |
| `ariaLabel` | `string` | — |

::: details Implementation notes
Full 2D-canvas sphere-of-icons implementation as the spec calls for: golden-angle Fibonacci sphere point distribution (no pole clumping), idle auto-rotation, direct drag-to-spin, inertial coasting with a friction decay factor after release, painter's-algorithm back-to-front draw order, and depth-driven size/opacity interpolation. Respects prefers-reduced-motion for the idle spin (drag remains available, since that's user-initiated, not imposed motion). One deliberate API-shape simplification: vector icon content is accepted as inline SVG *markup strings* (`glyphMarkup`) rather than as full Domphy element trees, since a Domphy element is bound to one DOM node and can't be safely re-mounted per-frame onto a canvas — both `image` URLs and `glyphMarkup` are pre-rendered once to offscreen `Image` bitmaps, matching the spec's 'two alternate content sources, pre-rendered to offscreen images' guidance. In jsdom (no `canvas` npm package installed), `getContext('2d')` resolves to `null`, so the component's own guard bails out of the animation loop before it starts — this is the same, established fail-closed pattern this package already uses for its other canvas/WebGL components (see `particles.ts`, `globe.ts`), verified structurally rather than pixel-rendered in tests. Direct-source-diff fix (2026-07-05, follow-up): added the missing click-an-icon-to-focus-it interaction (easeOutCubic rotation tween), verified via before/after-click screenshots showing the sphere rotate.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/icon-cloud)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/iconCloud.ts [iconCloud]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
