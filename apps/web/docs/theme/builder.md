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
   white in Oklab space (hue and chroma follow a rational warp curve), then
   re-samples that path at a constrained luminance ladder — the closest fit
   (subject to monotonicity and the AA floor) to the closed-form ladder
   `Y_i + 0.05 = 1.05 · 21^(-i/17)`, pulled toward your own hex's real
   luminance at its nearest step. Because contrast is
   `(Y_hi + 0.05)/(Y_lo + 0.05)`, every pair 9 steps apart still clears
   4.5:1 (5.01:1 on the unconstrained ladder) and every pair 8 apart clears
   less — so `K_ideal = ⌈0.501 × 17⌉ = 9` is the minimal AA span for any hue
   you type, by construction rather than by statistics, while the color you
   typed round-trips exactly whenever the AA floor allows it. See
   [`generateRamp`](../palette/generator).
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
