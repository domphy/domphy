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
import { generateRamp } from "@domphy/theme"

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
same interpolation. Waypoints keep the caller-supplied order (not sorted by
lightness) — but that order must already be compatible with the waypoints'
own real luminance (a later-position waypoint darker than an earlier one is a
direct contradiction of the ramp's monotonic contract); an incompatible order
throws, naming the offending pair.

## What "optimized" means

**Hue and chroma** come from the anchor colors' Oklab path, bent by a
rational warp curve (the `P`/`Q` fit described in `DESIGN.md`).

**Lightness** is not taken from that curve. Every ramp — single- or
multi-anchor — is re-sampled at a *constrained luminance ladder*: the
closest sequence (in log-contrast space) to the unconstrained closed-form
ladder

```
Y_i + 0.05 = 1.05 · r^i        r = 21^(-1/(N-1))
```

that still satisfies strict light-to-dark monotonicity, the near-white/
near-black edges, and `(Y_hi + 0.05) >= 4.5 * (Y_lo + 0.05)` for every pair of
steps `K = ⌈0.501 × (N-1)⌉` apart — 9 at `N = 18`, matching the unconstrained
ladder's own `r^-K` identity (5.01:1). **Every** anchor placement, single- or
multi-anchor, therefore clears WCAG AA 4.5:1 on every `shift-N`/`shift-N+K`
pair — this is what makes `themeColor(l, "text")` on a `shift-0` surface a
guarantee rather than a statistic.

Each anchor is additionally pinned toward its own real luminance at its
nearest step (a single anchor's pin is a strong preference the solve can
still move if the WCAG floor requires it; 2+ anchors are pinned exactly,
since the caller is asserting precise waypoints — infeasible waypoint
placements throw instead of silently breaking the pin or the guarantee).
Measured over a 12-anchor set spanning saturated primaries and pale pastels,
this recovers exact round-trip fidelity for most anchors and keeps max
ΔE2000 (nearest-step vs. input hex) at 1.16, down from 2.28 before this pin
existed.

A fixed warp in Oklab `L` alone cannot hold the WCAG span across hues: WCAG
contrast is a function of relative luminance `Y` alone, and Oklab `L` is not
a function of `Y`. Measured over a 4096-color sweep of the sRGB cube, the
warp-only sampling missed the `K = 9` AA contract for **22.78%** of ramps
(worst pair 3.22:1, base `#00ff00`); with the constrained ladder it is 0%,
including for multi-anchor ramps.

For the Oklab warp derivation, why Oklab instead of CIELAB for the hue path,
the constrained-ladder solve, and the five quality metrics `Ramp` measures,
see **[`DESIGN.md`](https://github.com/domphy/domphy/blob/main/DESIGN.md)**
§3 at the repo root.

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
