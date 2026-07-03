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

::: details Implementation notes
Fully implemented against the spec using real browser APIs (navigator.mediaDevices.getUserMedia, a hidden &lt;video&gt;, and a canvas redraw loop with onWebcamReady/onWebcamError callbacks and graceful no-camera/permission-denied fallback to a plain dark placeholder, matching the spec's own researchNote). Marked 'partial' for two implementer choices the spec itself flagged as open/unverified: (1) elevation is rendered as a 2D canvas shading trick (small upward pixel offset + brightness boost) rather than true per-tile CSS 3D perspective transforms, chosen because redrawing 64x48=3072 individually-transformed DOM tiles every frame would be far more expensive than one canvas redraw; (2) the visual result could not be verified against a live camera in this sandboxed/headless environment (no camera hardware, no `canvas` npm package for jsdom's 2D context), so only structural/fallback behavior was exercised by tests, not live motion.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/webcam-pixel-grid)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/webcamPixelGrid.ts [webcamPixelGrid]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
