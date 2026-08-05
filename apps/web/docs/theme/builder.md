---
title: "Theme Builder"
description: "Live theme studio — generate accessible Domphy themes from one base color per role, with contrast feedback, light/dark preview, and a real component gallery."
sidebar: false
aside: false
layout: page
wide: true
---

<script setup lang="ts">

import ThemeBuilder from "../demos/theme/ThemeBuilder.js"
</script>

<DomphyPreview :element="ThemeBuilder" bare />

::: details How it works

Every keystroke in the control pane runs the exact pipeline described in
[**`DESIGN.md`**](https://github.com/domphy/domphy/blob/main/DESIGN.md):

1. `generateRamp(hex, 18)` interpolates from black through your color to
   white in Oklab space, sampled through a rational warp curve tuned so the
   WCAG 4.5:1 contrast pair lands at index distance 9 (`K_ideal = ⌈0.501 ×
   17⌉`) — not by convention, by construction.
2. `generateTheme` repeats this per role and finds each `baseTones` index by
   nearest CIEDE2000 match to your original input, so `themeColor(l, "base",
   role)` still resolves to (approximately) the color you actually picked.
   Font sizes and densities pass through as-is — they're already the values
   `themeSize()`/`themeDensity()` consume directly.
3. `setTheme(name, theme)` + `themeApply()` register light and dark siblings
   under isolated theme names so the site chrome is never touched — ramps,
   contrast checks, and the component gallery update through real CSS custom
   properties.
4. Contrast feedback uses `contrastRatio` (WCAG 2.1) on live generated
   ramps; ramp quality scores come from the palette engine's `Ramp.score`.

**Reset** restores default role colors; **Randomize** explores freely;
**Harmony** fills every role from the current primary via a simple hue-wheel
scheme. **Copy setTheme() snippet** pastes the current `ThemeInput` into your
app under the name you set.

Read next: [`generateRamp`](../palette/generator) · [Palette](./palette) ·
[`DESIGN.md`](https://github.com/domphy/domphy/blob/main/DESIGN.md)

:::
