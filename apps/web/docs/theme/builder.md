---
title: "Theme Builder"
description: "Generate a complete accessible Domphy theme from one base color per role — live, with a real component gallery."
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

Every keystroke in the sidebar runs the exact pipeline described in
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
3. `setTheme(name, theme)` + `themeApply()` register it as a live theme,
   scoped to its own theme name so it never touches the page's own
   light/dark theme — the swatches and the entire component gallery update
   through real CSS custom properties.

The **Copy ThemeInput JSON** button copies the exact `ThemeInput` object,
wrapped in the `setTheme("brand", …)` call you'd paste into your app.

Read next: [`generateRamp`](../palette/generator) · [Palette](./palette) ·
[`DESIGN.md`](https://github.com/domphy/domphy/blob/main/DESIGN.md)

:::
