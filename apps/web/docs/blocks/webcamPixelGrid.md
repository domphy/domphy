---
title: "@domphy/blocks — webcamPixelGrid"
description: "Fully implemented against the spec using real browser APIs (navigator.mediaDevices.getUserMedia, a hidden <video>, and a canvas redraw loop with..."
---

# webcamPixelGrid

<script setup lang="ts">
import WebcamPixelGridDemo from "../demos/blocks/webcamPixelGrid.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `webcamPixelGrid()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="WebcamPixelGridDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `gridCols` | `number` | Sampling grid columns. Defaults to `64`. |
| `gridRows` | `number` | Sampling grid rows. Defaults to `48`. |
| `motionSensitivity` | `number` | How strongly frame-to-frame color change drives the elevation pop, `0-1`. Defaults to `0.6`. |
| `maxElevation` | `number` | Maximum per-tile upward pixel offset at full elevation. Defaults to `15`. |
| `elevationSmoothing` | `number` | Low-pass smoothing factor easing elevation toward its target each frame, `0-1` (higher = snappier). Defaults to `0.1`. |
| `colorMode` | `WebcamPixelGridColorMode` | `"webcam"` samples true per-tile color; `"monochrome"` recolors every tile toward `monochromeColor` at the sampled brightness. Defaults to `"webcam"`. |
| `monochromeColor` | `ThemeColor` | Theme color family used for every tile in monochrome mode. Defaults to `"success"` (a bright green family). |
| `backgroundColor` | `ThemeColor` | Theme color family for the container backdrop showing through tile gaps. Defaults to `"neutral"`. |
| `borderColor` | `ThemeColor` | Theme color family for each tile's outline. Defaults to `"neutral"`. |
| `borderOpacity` | `number` | Opacity of each tile's outline, `0-1`. Defaults to `0.15`. |
| `mirror` | `boolean` | Flips the sampled feed horizontally, like a mirror/selfie view. Defaults to `true`. |
| `gapRatio` | `number` | Fraction of each cell reserved as a gap between tiles, `0-1`. Defaults to `0.12`. |
| `invertColors` | `boolean` | Inverts every sampled color (`255 - channel`). Defaults to `false`. |
| `darken` | `number` | Darkens every sampled color, `0` (no change) to `1` (black). Defaults to `0`. |
| `onWebcamReady` | `() =&gt; void` | Fires once the webcam stream is playing. |
| `onWebcamError` | `(error: unknown) =&gt; void` | Fires when the webcam can't be accessed (no API, no device, or denied permission). |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the pixel grid (a hero headline, a CTA, an "enable camera" prompt, …) — the grid is a background effect that plays behind whatever's placed here, camera or no camera. Defaults to a small demo heading so the block reads as something even where no camera is available (this is also the ordinary case for automated/headless environments, which have no webcam to grant). |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Fully implemented against the spec using real browser APIs (navigator.mediaDevices.getUserMedia, a hidden &lt;video&gt;, and a canvas redraw loop with onWebcamReady/onWebcamError callbacks and graceful no-camera/permission-denied fallback to a plain dark placeholder, matching the spec's own researchNote). Marked 'partial' for two implementer choices the spec itself flagged as open/unverified: (1) elevation is rendered as a 2D canvas shading trick (small upward pixel offset + brightness boost) rather than true per-tile CSS 3D perspective transforms, chosen because redrawing 64x48=3072 individually-transformed DOM tiles every frame would be far more expensive than one canvas redraw; (2) the visual result could not be verified against a live camera in this sandboxed/headless environment (no camera hardware, no `canvas` npm package for jsdom's 2D context), so only structural/fallback behavior was exercised by tests, not live motion.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/webcam-pixel-grid)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/webcamPixelGrid.ts [webcamPixelGrid]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
