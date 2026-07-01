---
title: "generateRamp"
description: "Generate a WCAG-optimized sequential color ramp from a base color, or several."
---

# generateRamp

`generateRamp` builds an 18-step (or any `N`-step) monochromatic ramp from one
or more anchor colors — the counterpart to `Ramp`/`Palette` (which *measure*
quality). Where those classes answer "is this ramp good?", `generateRamp`
answers "build one that scores well, from a single brand color, with no
manual tuning."

```ts
import { generateRamp } from "@domphy/palette"

const primary = generateRamp("#4a7ff4", 18)
// 18 hex strings, lightest first: ["#ffffff", …, "#000000"]
```

## Signature

```ts
generateRamp(hexs: string | string[], stepsCount: number): string[]
```

| Parameter | Type | Description |
| --- | --- | --- |
| `hexs` | `string \| string[]` | One base color, or several ordered anchors the ramp must pass through. |
| `stepsCount` | `number` | Output length. `18` matches `@domphy/theme`'s tone scale (`shift-0`..`shift-17`). |

Output is ordered **light-to-dark** (`ramp[0]` ≈ white, `ramp[N-1]` ≈ black) —
this is `@domphy/theme`'s `ThemeInput.colors[name]` convention, so the result
can be assigned there directly.

Passing more than one color pins each as a fixed waypoint (e.g. an existing
brand color that must land at a specific position), still connected by the
same interpolation.

## What "optimized" means

The generator does not sample the anchor colors' Oklab path at even
intervals — it bends the sampling curve so that, once sliced into `N`
discrete steps, the WCAG 4.5:1 contrast span lands as close as possible to
the analytically-derived ideal span (`K_ideal = ⌈0.501 × (N-1)⌉` — 9 for an
18-step ramp). Validated against 600 synthetic base colors (weighted toward
green/cyan hues, where perceptual uniformity is hardest): ~95.9% of
generated ramps need zero manual accessibility correction, ~88.5% hit the
ideal span exactly.

For the full derivation — the warp/unwarp rational function, why Oklab
instead of CIELAB for this step, and how it connects to the five quality
metrics `Ramp` measures — see **[`DESIGN.md`](https://github.com/domphy/domphy/blob/main/DESIGN.md)**
at the repo root.

## Building a full theme

`@domphy/theme`'s `generateTheme` composes `generateRamp` per semantic color
role into a complete `ThemeInput` — see
[Theme → Palette → Custom Palette](../theme/palette.md#custom-palette).

```ts
import { generateTheme } from "@domphy/theme"

const theme = generateTheme({
  primary: "#4a7ff4",
  secondary: "#d8597d",
  neutral: "#8d8d8d",
})
```
