<script setup lang="ts">

import ThemeBuilder from "../demos/theme/ThemeBuilder.js"
</script>

# Theme Builder

A sidebar configurator + a live gallery of real `@domphy/ui` patches — judge
a generated theme against actual components, not just color swatches.

- **Colors tab** — one base color per semantic role. The 18-step ramp for
  each role, its WCAG-checked contrast span, and the `baseTones` index are
  all generated live by [`generateTheme`](../palette/generator)
  (`@domphy/theme` + `@domphy/palette`). No manual tuning, no separate
  accessibility pass.
- **Size & Density tab** — the 8-step `fontSizes` scale and the 5-step
  `densities` scale, the same arrays `themeSize()`/`themeDensity()` read.
- **Preview theme switcher** — flip the gallery between your generated theme
  and the built-in `light` theme instantly, via the same `dataTheme`
  mechanism any Domphy app uses for light/dark switching.
- **Export panel** — the exact `ThemeInput` JSON, ready for
  `setTheme(name, json)`.

<DomphyPreview :element="ThemeBuilder"/>

## How it works

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
   light/dark theme — the swatches and the entire component gallery below
   update through real CSS custom properties.

The **Export** panel is the exact `ThemeInput` object as JSON —
copy-pasteable straight into `setTheme("brand", <paste>)`.

## Source

<<< @/docs/demos/theme/ThemeBuilder.ts

## What to read next

1. [`generateRamp`](../palette/generator) — the generator API on its own
2. [Palette](./palette) — the built-in `light` theme's ramps, and how to
   register a custom one by hand
3. [`DESIGN.md`](https://github.com/domphy/domphy/blob/main/DESIGN.md) — the
   full math: the five quality metrics, the warp/unwarp derivation, and how
   it all ties into the context-aware tone/spacing/size model
