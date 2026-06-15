# Paper II — Generating Accessible Palettes

[Paper I](./measuring) defines what makes a sequential ramp good. This paper describes how `@domphy/palette`'s generator produces ramps that score well **by construction**, and how it was tuned against those very metrics.

```ts
import { generateRamp } from "@domphy/palette"
const blue = generateRamp(["#3b82f6"], 18) // white → color → black, 18 perceptual steps
```

## The model

From one or more seed colors, the generator builds a ramp from light to dark by interpolating in a **perceptual** space rather than sRGB:

1. **Anchor in CIELAB / OKLab.** The seed is converted to perceptual coordinates so interpolation moves the way the eye sees, not the way bytes increase.
2. **Lightness on an H–K-corrected axis.** Steps are placed on an *equivalent achromatic lightness* axis (`toLightnessEAL` / `fromLightnessEAL`) that accounts for the Helmholtz–Kohlrausch effect — highly chromatic colors appear lighter than their L\* suggests, so the ramp compensates to keep **lightness linearity** high.
3. **A tuned lightness warp.** A two-parameter warp `(p, q)` reshapes the lightness distribution so the ramp spends its range where it matters — guaranteeing a WCAG **4.5:1** contrast pair exists (high **contrast efficiency**) instead of wasting steps at the extremes.
4. **Monotone chroma.** Chroma across the ramp is fitted with **monotone cubic splines** (`createMonotone`), so the saturation arc is smooth with no kinks (high **chroma smoothness**) and hue is held steady (high **hue stability**).
5. **Even spacing.** The step placement targets uniform **ΔE2000** between neighbors (high **spacing uniformity**).

The output is a list of hex stops directly usable as design-system tokens.

## Tuned by the metrics

The warp defaults (`p = 0.605`, `q = 0.685`) were not guessed — they were found by `optimize()`, which searches the parameter space and scores each candidate ramp with the [Paper I metrics](./measuring), keeping the parameters that maximize the geometric-mean score:

```ts
import { optimize } from "@domphy/palette"
const result = optimize() // grid + refine search → best (p, q) and score
```

This closes the loop: **the same metrics that grade a palette also tune the generator that makes one.** Generation and validation are one science, not two heuristics.

## With Domphy

Generate a ramp, validate it, feed it to the theme:

```ts
import { generateRamp, Ramp } from "@domphy/palette"

const brand = generateRamp(["#7c3aed"], 18)
console.log(new Ramp(brand, "brand").score) // verify before shipping
// → register `brand` as a theme color ramp in @domphy/theme
```

`@domphy/theme` ships Adobe-Spectrum-derived ramps by default (top of the [benchmark](./measuring)); `@domphy/palette` lets you generate brand ramps to the same standard and prove it.
