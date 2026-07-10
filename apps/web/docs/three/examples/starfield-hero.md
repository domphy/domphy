---
title: "@domphy/three — Starfield Hero"
description: "A full-width marketing hero: three depth-layered star shells drifting behind a DOM overlay (heading, copy, CTA) composited straight on top of the canvas via absolute positioning and a shared dark tone context."
---

# Starfield Hero

A landing-page hero, not a scene demo — three concentric shells of points at increasing radius and decreasing size and speed, so nearer stars visibly slide past farther ones purely from each shell spinning at its own rate. A slow camera float/pan and a subtle fog give it depth without any per-frame geometry rebuilding. On top, an ordinary Domphy DOM tree (heading, copy, CTA button) is absolutely positioned over the canvas — same element tree, no portal, no iframe.

<script setup lang="ts">
import StarfieldHeroDemo from "../../demos/three/starfield-hero.ts?raw"
</script>

<CodeEditor :code="StarfieldHeroDemo" />

## How it works

- **DOM-over-canvas composition**: the host is a `position: relative` div containing two absolutely-positioned children — the `three()` canvas layer and a DOM overlay layer. Setting `style.position: "absolute"` directly on the canvas-host div wins over the `three()` patch's own `position: relative` default, since a native element's own style always wins over a patch's — see the [`ThreeOptions` contract](/docs/three/grammar).
- **Layered depth via independent spin rates**: each star shell is its own `points` node with its own `onFrame`, rotating at a different `spinSpeed` — no positions are ever rewritten per frame, only each shell's own rotation. See [`onFrame`](/docs/three/animation#onframe).
- **Shared dark tone context**: the overlay div sets `dataTone: "shift-16"` (a dark edge anchor), so every descendant patch — `heading()`, `paragraph()`, `small()`, `button()` — resolves its `themeColor()` calls against that dark surface automatically, with no color overrides needed on any of them.
- **DOM event driving a canvas prop**: the CTA's `onClick` bumps a plain `State<number>`; the near shell's `onFrame` reads it untracked each tick (the same pulse-on-change technique [Interactive Grid](./interactive-grid) uses for its click bump) to fire a brief forward camera "warp" dash that eases back out.
- **Explicit vertex colors on the near shell**: the closest shell is the only one built with a `bufferAttribute` color channel (`attach: "attributes-color"`) so a scattered minority of points can lean warm or cool against the mostly-white base — see [`attach` inference](/docs/three/grammar#attach-inference) for why `bufferAttribute` always needs an explicit `attach` path.
- **Glowing points, not flat dots**: each shell's `pointsMaterial` gets a `map` — a soft radial-gradient sprite drawn once onto a `CanvasTexture` — combined with `blending: AdditiveBlending`. `sizeAttenuation: false` keeps each shell's point size fixed in screen pixels (3.6px near, 2px mid, 1px far) instead of shrinking with camera distance, so the far shell fades out via fog rather than just growing small and dim.
- **`frameloop: "always"`**: the drift is continuous and time-based, not state-driven, so nothing ever calls `invalidate()` — see [frameloop modes](/docs/three/animation#frameloop-modes) for why `"demand"` would freeze this scene on its first frame.

[← Back to @domphy/three](/docs/three/)
