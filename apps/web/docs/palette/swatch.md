---
title: "Swatch & Color Utilities"
description: "The Swatch class for inspecting individual colors, plus the exported color-space conversion and statistics functions."
---

# Swatch & Color Utilities

`@domphy/palette` exports the `Swatch` class and a suite of standalone color-space functions. These are the building blocks used internally by `Ramp`, and you can use them independently to inspect a single color, convert between color spaces, or build custom palette tooling.

## Swatch

`Swatch` wraps a single hex color and lazily computes its CIELAB, LCH, perceptual lightness, and relative luminance.

```ts
import { Swatch } from "@domphy/palette"

const s = new Swatch("#3b82f6")
```

### `swatch.hex`

The original hex string exactly as supplied.

```ts
s.hex  // "#3b82f6"
```

### `swatch.rgb`

Linear sRGB as `[r, g, b]`, each channel in `[0, 1]`. The input hex is gamma-decoded from sRGB to linear before being stored.

```ts
s.rgb  // [0.0438, 0.2233, 0.9216]
```

Note: these are *linear* values, not the raw 8-bit `0–255` values divided by 255. A channel value of 0.9216 does not mean 92% brightness — it means the linear-light contribution of that channel.

### `swatch.lab`

CIELAB coordinates `[L, a, b]` with D65 reference white. L is perceptual lightness (0–100); a/b are the opponent-color axes (negative a = green, positive a = red, negative b = blue, positive b = yellow).

```ts
s.lab  // [55.63, 17.5, -64.5]
//        L      a      b
```

### `swatch.lch`

LCH coordinates `[L, C, h]` — a polar form of CIELAB. C is chroma (roughly "colorfulness", 0–133+), h is hue angle in degrees (0–360).

```ts
s.lch  // [55.63, 66.77, 285.23]
//        L      C      hue°
```

### `swatch.lightness`

**Equivalent Achromatic Lightness (L_EAL)** using the High et al. (2023) model. Standard CIE L lightness under-reports how bright a highly-chromatic color looks to the eye — the Helmholtz–Kohlrausch effect. L_EAL corrects for this by adding a hue- and chroma-dependent term.

```ts
s.lightness  // 73.23  (vs. CIE L = 55.63 — the bright blue looks much lighter)
```

For achromatic colors (white, grey, black) L_EAL equals CIE L exactly because chroma is zero. Differences appear for saturated colors, especially yellow and blue.

This is the value `Ramp.lightnessLinearity` measures evenness against.

### `swatch.chroma`

LCH chroma — a convenience accessor for `lch[1]`. Zero for achromatic swatches.

```ts
s.chroma                    // 66.77
new Swatch("#ffffff").chroma  // ≈ 0
new Swatch("#000000").chroma  // ≈ 0
```

### `swatch.hue`

LCH hue angle in degrees — a convenience accessor for `lch[2]`.

```ts
s.hue  // 285.23  (blue-violet range)
```

### `swatch.luminance`

Relative luminance following the WCAG 2.x / Rec.709 formula: `0.2126R + 0.7152G + 0.0722B` applied to the linear RGB channels. Range `[0, 1]`.

```ts
s.luminance  // 0.2355
```

Use this to compute WCAG contrast ratios directly:

```ts
function wcagContrast(hex1: string, hex2: string): number {
  const l1 = new Swatch(hex1).luminance
  const l2 = new Swatch(hex2).luminance
  const lighter = Math.max(l1, l2)
  const darker  = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

wcagContrast("#3b82f6", "#ffffff")  // ≈ 3.68  (AA fails for normal text)
wcagContrast("#2354b2", "#ffffff")  // ≈ 7.05  (AAA)
```

## Color-space conversion functions

All of the following are named exports from `@domphy/palette`:

```ts
import {
  hexToRgb, rgbToHex,
  rgbToLab, labToRgb,
  rgbToOklab, oklabToRgb,
  labToLch, lchToLab,
  toLightnessEAL, fromLightnessEAL,
  calcDeltaE2000,
  cssRgbToRgb,
  createMonotone,
  calcScore, calcStatistics, rootMeanSquare,
} from "@domphy/palette"
```

### Hex ↔ linear RGB

```ts
const rgb = hexToRgb("#3b82f6")  // [0.0438, 0.2233, 0.9216]  — linear sRGB
const hex = rgbToHex(rgb)        // "#3b82f6"
```

Input hex must be `#rrggbb` (lowercase or uppercase, both work). Both functions use the standard sRGB gamma curve (γ = 2.4 with a linear toe).

### Linear RGB ↔ CIELAB

```ts
const lab  = rgbToLab([0.0438, 0.2233, 0.9216])  // [55.63, 17.5, -64.5]
const rgb2 = labToRgb([55.63, 17.5, -64.5])      // [0.0438, 0.2233, 0.9216]
```

D65 reference white. The round-trip is accurate within floating-point precision. Values outside the sRGB gamut are not clamped by these functions — clamping happens inside `rgbToHex`.

### Linear RGB ↔ Oklab

Oklab (Björn Ottosson, 2020) is a perceptually uniform color space well-suited for interpolation and gamut mapping. Input and output are linear RGB.

```ts
const oklab = rgbToOklab([0.0438, 0.2233, 0.9216])
// [0.546, -0.028, -0.232]  — [L, a, b] in Oklab

const rgb3 = oklabToRgb(oklab)
// [0.0438, 0.2233, 0.9216]
```

Oklab L is in `[0, 1]` (unlike CIELAB L in `[0, 100]`).

### CIELAB ↔ LCH

```ts
const lch  = labToLch([55.63, 17.5, -64.5])   // [55.63, 66.77, 285.23]
const lab2 = lchToLab([55.63, 66.77, 285.23]) // [55.63, 17.5, -64.5]
```

### L_EAL: perceptual lightness

`toLightnessEAL` takes a CIELAB coordinate and returns Equivalent Achromatic Lightness:

```ts
const lab = rgbToLab(hexToRgb("#3b82f6"))
const eal = toLightnessEAL(lab)  // 73.23
```

`fromLightnessEAL` reverses the operation. Given a target L_EAL and a CIELAB coordinate (encoding the chroma and hue of a color), it returns the CIE L that produces that L_EAL:

```ts
// "At what CIE L does this blue hue produce L_EAL = 70?"
const cieL = fromLightnessEAL(70, lab)  // ≈ 52
```

This is useful when building a ramp generator: you specify evenly-spaced L_EAL targets, then use `fromLightnessEAL` to find the correct CIE L for each step before interpolating in LCH space.

### ΔE2000 color difference

`calcDeltaE2000` computes the CIEDE2000 distance between two CIELAB coordinates. A value of 1 is approximately the smallest perceivable difference under optimal viewing conditions; values below 2 are often indistinguishable in practice.

```ts
const lab1 = rgbToLab(hexToRgb("#3b82f6"))  // blue-500
const lab2 = rgbToLab(hexToRgb("#2f6bd4"))  // blue-600

calcDeltaE2000(lab1, lab2)  // e.g. 8.4  (one step in a blue ramp)
```

`Ramp.deltaECurve` calls this for every adjacent pair to build the cumulative distance curve.

### CSS `rgb()` input

`cssRgbToRgb` parses a CSS `rgb()` string and returns linear RGB:

```ts
cssRgbToRgb("rgb(59, 130, 246)")  // [0.0438, 0.2233, 0.9216]
```

Useful when consuming colors from `getComputedStyle`, design tokens stored as CSS rgb values, or Figma's variable export format.

### Statistics helpers

```ts
import { calcStatistics, rootMeanSquare, calcScore } from "@domphy/palette"

calcStatistics([0.90, 0.85, 0.88, 0.92])
// { min: 0.85, max: 0.92, avg: 0.8875 }

rootMeanSquare([0.90, 0.85, 0.88, 0.92])
// ≈ 0.8876  — RMS, same formula Palette uses for aggregate metrics

calcScore([0.923, 0.951, 0.887, 0.942, 0.831])
// ≈ 90.7  — geometric mean scaled to 0–100, same as Ramp.score
```

`calcScore` accepts any array of `[0, 1]` values and returns the geometric mean as a 0–100 number. You can use it to compose custom quality signals alongside the built-in ones:

```ts
import { calcScore } from "@domphy/palette"

// Custom metric: fraction of steps that are not too dark for body text
const usableSteps = ramp.swatches.filter(s => s.lightness > 30 && s.lightness < 85).length
const usabilityScore = usableSteps / ramp.steps

// Blend into your own composite score
const combined = calcScore([
  ramp.metrics.lightnessLinearity,
  ramp.metrics.chromaSmoothness,
  usabilityScore,
])
```

### Monotone cubic spline

`createMonotone` builds a monotone cubic Hermite interpolator from `[x, y]` control points. It guarantees no overshoot between adjacent points (Fritsch–Carlson 1980), which is why `Ramp.chromaSmoothness` uses it to fit a reference chroma arc.

```ts
import { createMonotone } from "@domphy/palette"

// Control points: (step index, chroma value)
const interp = createMonotone([[0, 10], [6, 133], [17, 5]])

interp(3)   // interpolated chroma at step 3  — on the ascending arc
interp(12)  // interpolated chroma at step 12 — on the descending arc
```

This is primarily an internal utility, but it is exported for ramp generators that need to fit a smooth chroma target before generating colors.
