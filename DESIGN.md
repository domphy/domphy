# DESIGN.md — Domphy Design System

Domphy's theme is not a hand-picked palette plus a spacing scale. Every color
step, every spacing value, and every size step is the output of a formula —
derived from published perceptual color science and validated against an
open, reproducible quality framework. This document is the mathematical
reference: what each formula is, why it's shaped that way, and how the
constraint system makes an element **context-aware** (it adapts to its
surface, density, and size context instead of carrying a fixed style).

Read `AGENTS.md` first for the *API* (`themeColor`, `themeSpacing`,
`themeSize`, tone semantics). This document is the *why* behind that API —
useful when generating a new palette, tuning a component's geometry, or
explaining to a reviewer (human or AI) that a token was not invented.

## 1. Two axes, one system

Domphy's design tokens split into two independent, formula-driven axes:

| Axis | Package | Governs | Section |
|---|---|---|---|
| **Color** | `@domphy/palette` | 18-step tone ramps per semantic color | §2–§4 |
| **Space** | `@domphy/theme` | spacing, density, size (typography + control geometry) | §5 |

Both axes share the same design philosophy: pick a small number of
free parameters, derive everything else from a closed-form relationship, and
validate the result against a measurable target rather than eyeballing it.

## 2. Color axis: the evaluation framework

Domphy's color science lives in `@domphy/palette`, a port of
[chromametry](https://github.com/chromametry/chromametry) — a published,
open-source, peer-citable framework:

> Nguyen, H. K. *A Quantitative Framework for Evaluating Sequential Color
> Palette Quality in Design Systems.* Independent Researcher, 2026.
> [`paper.pdf`](https://chromametry.github.io/chromametry/paper/paper.pdf) ·
> [benchmark](https://chromametry.github.io/chromametry/benchmark)

The framework scores an 18-step monochromatic ramp — the shape every
`ThemeInput.colors[name]` array must have — along five independent
dimensions, all computed in CIELAB and combined by geometric mean so no
single strong metric can hide a structurally broken one:

```
SCORE = 100 · [(η+ε)(𝓛+ε)(S_C+ε)(𝓗+ε)(U+ε)]^(1/5)     (ε = 1e-6, numerical floor)
```

(ε is added to *each* metric before the product — not once after — matching both
`calcScore` in `packages/palette/src/utils.ts` and the chromametry paper's own
`SCORE = 100·[∏ₖ(Mₖ+ε)]^(1/5)`. For the tiny ε=1e-6 used here the two forms are
numerically indistinguishable in practice, but only the per-term form is what the
code and paper actually compute.)

### 2.1 Contrast Efficiency (η) — the load-bearing metric

This is the metric the rest of Domphy's tone system is built around.

For a ramp of `N` steps, the **contrast span** `K` is the minimum index
distance `k` such that *every* pair of steps `k` apart clears WCAG 4.5:1:

```
K = min { k ∈ ℕ : CR(cᵢ, cᵢ₊ₖ) ≥ 4.5,  ∀i ∈ [0, N-k-1] }
```

If `K` is known, a consumer never has to runtime-check a contrast pair — pick
any background step `i`, and step `i ± K` is guaranteed to pass 4.5:1 as
text. This is *why* Domphy's tone-anchoring rule works
(`themeColor(l, "shift-9")` reliably reads as body text against a
`shift-0` surface): the ramp was built so a fixed index offset is
accessibility-safe everywhere on the ramp, not just at the two ends.

The **ideal** span is derived analytically, not benchmarked. For a neutral
(achromatic) ramp, CIELAB lightness `L*` maps to relative luminance `Y` by
the CIE 1976 transform. Solving the WCAG 4.5:1 boundary condition from both
ends (black background and white background) and taking the conservative
(larger) case gives:

```
λ = max(λ_black, λ_white) ≈ 0.501
K_ideal = ⌈ λ · (N-1) ⌉
```

For `N = 18` (Domphy's tone scale): `K_ideal = ⌈0.501 × 17⌉ = 9`. This is why
Domphy's 18-step ramp and the `shift-N` tone system are the sizes they are —
9 is the number of tone steps you can reliably jump for guaranteed contrast,
almost exactly half the ramp.

Efficiency is then the gap between the *observed* density `D = K/(N-1)` and
this ideal:

```
η = 1                              if D ≤ λ
η = 0                              if D ≥ 1
η = 1 - (D - λ)/(1 - λ)            otherwise
```

A palette that "wastes" lightness range (needs a wider index gap than
necessary to reach 4.5:1) scores low here even if every individual pair is
technically compliant — η measures *economy*, not just pass/fail.

### 2.2 Lightness Linearity (𝓛) — corrected for chroma-driven brightness

Raw CIELAB `L*` is not what a viewer perceives as "how light" a color is: the
Helmholtz–Kohlrausch effect means a high-chroma color looks brighter than an
achromatic color at the *same* `L*`. Domphy corrects for this using
**Equivalent Achromatic Lightness (EAL)**, from:

> High, G., Green, P., & Nussbaum, P. *The Helmholtz–Kohlrausch effect on
> display-based light colors and simulated substrate colors.* Color Research
> & Application, 48(2):167–177, 2023.

```
L_EAL = L* + (f_BY(h) + f_R(h)) · C*

f_BY(h) = 0.1644 |sin((h - 90°)/2)| + 0.0603
f_R(h)  = 0.1307 |cos(h)| + 0.0060    if h ∈ [0°,90°] ∪ [270°,360°], else 0
```

`toLightnessEAL`/`fromLightnessEAL` in `packages/palette/src/utils.ts`
implement this exactly. A ramp is scored by fitting `L_EAL` against step
index with ordinary least squares and normalizing the RMS residual by the
fitted line's own range — 1.0 means perfectly linear perceived lightness,
independent of direction (light-to-dark or dark-to-light) or absolute
magnitude.

### 2.3 Chroma Smoothness (S_C) — monotone spline, not a raw power curve

A naive lightness/chroma parameterization (Zeileis et al. 2009's power-curve
model, `C(t) = C_max - t^p(C_max - C_min)`) needs a piecewise definition when
peak chroma sits mid-ramp, and the two pieces' derivatives don't generally
agree at the seam — a `C¹` discontinuity that shows up as a visible chroma
"kink" (a Mach-band artifact). Domphy avoids the seam entirely: chroma is
fit with a single **monotone cubic Hermite spline**
(Fritsch & Carlson, 1980) through three anchors — start, peak, end — which
guarantees `C¹` continuity and no overshoot (Runge's phenomenon) by
construction. `createMonotone` in `packages/palette/src/utils.ts` is this
spline; it's also the same interpolator the generator (§3) uses for the `a`,
`b` Oklab channels.

### 2.4 Hue Stability (𝓗) and 2.5 Spacing Uniformity (U)

Hue stability measures angular drift (unwrapped, endpoint-excluded since
white/black have undefined hue) from the ramp's peak-chroma reference hue,
normalized against a worst-case linear-drift envelope. Spacing uniformity
measures the coefficient of variation of consecutive **CIEDE2000** steps
(`ΔE₀₀`, the perceptually-calibrated color-difference metric — plain
Euclidean CIELAB distance is not perceptually uniform, especially in blues),
mapped to `(0,1]` via `U = 1/(1+CV)`.

Both are implemented as getters on `Ramp` in `packages/palette/src/Ramp.ts` —
`ramp.metrics` returns all five, `ramp.score` the composite.

## 3. Color axis: the generator (`generateRamp`)

The evaluation framework (§2) answers "is this ramp good?" — `generateRamp`
(`packages/palette/src/Generator.ts`) answers "build one that scores well,
from a single brand color, with no manual tuning."

### 3.1 Why a rational warp

Sampling a straight line between two Oklab anchors at evenly-spaced
parameter values does **not** put the WCAG 4.5:1 contrast pair at the
analytically ideal span `K_ideal` from §2.1 — lightness does not vary
linearly with index in a way that respects the CIE 1976 `L*↔Y` transform,
and pure linear-in-`t` sampling over-allocates steps to whichever half of the
ramp (light or dark) happens to have more perceptual "room." The generator
instead **bends** the sampling parameter before it hits the Oklab anchors,
using a two-parameter rational warp:

```
warp(t)   = t^P / (1 + Q(1 - t^P))
unwarp(y) = ((y(1+Q)) / (1+yQ))^(1/P)
```

`warp` is applied to the *output* sampling grid (evenly-spaced step indices);
`unwarp` is applied once, up front, to place each anchor's own position
along the curve in the same warped space, so the anchor still lands exactly
where it should after warping. The net effect: more output steps get spent
where the WCAG boundary actually is, fewer where it isn't — pulling the
generated ramp's observed span `K` toward `K_ideal` without hand-tuning.

### 3.2 Fitting P and Q

`P` and `Q` are not arbitrary — they were found by grid search + local hill
climbing (step-halving refinement) over 600 synthetic base colors sampled
disproportionately from the color-science-hard regions (green and
blue-green/cyan hues, where CIELAB/Oklab perceptual uniformity is weakest),
jointly maximizing:

- the mean of the §2 composite `SCORE` across all generated ramps,
- the fraction of ramps whose observed span `K` is `≤ K_ideal` ("coverage"),
- the fraction with `K` *exactly equal* to `K_ideal` ("exact match"),

while penalizing the average `|K - K_ideal|` span error. The search
converged at:

```
P = 0.605
Q = 0.685
```

achieving ≈90.6 average `SCORE` (of 100), ≈95.9% coverage, and ≈88.5% exact
`K = K_ideal` match across the 600-color validation set — i.e. for the vast
majority of arbitrary brand colors, the generated 18-step ramp needs no
manual accessibility pass at all. `packages/palette/tests/generator.test.ts`
re-validates this end-to-end (generate → score with `Ramp` → assert `score >
75` and `contrastEfficiency > 0.7`) for five colors spanning the hard hue
regions, so a future change to either the generator or the evaluator that
breaks this relationship fails CI, not a design review.

### 3.3 The full pipeline

1. Convert the base color(s) plus implicit pure-black and pure-white anchors
   to **Oklab** (Björn Ottosson, 2020) — chosen over CIELAB for the
   generation step specifically because Oklab's hue lines stay closer to
   perceptually constant hue under lightness changes, which matters when
   interpolating rather than just measuring.
2. Sort anchors by Oklab lightness; walk the resulting polyline and compute
   **cumulative Euclidean arc length** — this is the *unwarped* parameter
   space, proportional to how much the color actually changes, not to index.
3. `unwarp` each anchor's normalized cumulative distance into warped
   parameter space (§3.1) — this is where the anchor sits once the output
   grid is built by `warp`.
4. For each of the `N` output steps, compute its position in the anchor
   polyline (linear between neighboring anchor indices), then `warp` that
   position and map it back into the arc-length parameter range.
5. Interpolate: `L` linearly per Oklab segment; `a`/`b` (the two chroma
   channels) through the same **monotone cubic spline** as §2.3, evaluated
   across *all* anchors at once — a smooth single-peak chroma trajectory,
   avoiding the derivative discontinuity that motivated §2.3 in the first
   place.
6. Convert back Oklab → linear sRGB → hex.

Passing more than one anchor color pins each as a fixed waypoint the ramp
must pass through (e.g. a specific existing brand color at a specific
position), still connected by the same warped interpolation — the ramp is
not required to be generated from a single color.

Output is ordered light-to-dark (`ramp[0]` ≈ white, `ramp[N-1]` ≈ black),
matching `ThemeInput.colors[name]`'s convention directly:

```ts
import { generateRamp } from "@domphy/palette"
const primary = generateRamp("#4a7ff4", 18)   // 18 hex strings, ready to assign
```

### 3.4 `generateTheme` — a full theme in one call

`@domphy/theme` composes `generateRamp` per semantic role into a complete
`ThemeInput`:

```ts
import { generateTheme } from "@domphy/theme"

const theme = generateTheme({
  primary: "#4a7ff4",
  secondary: "#d8597d",
  neutral: "#8d8d8d",
})
setTheme("brand", theme)
```

Each role's `baseTones` entry is chosen as the ramp step nearest (by
CIEDE2000) to the caller's original input hex — so `themeColor(l, "base",
"primary")` still resolves to (approximately) the exact color that was
passed in, not just "some point on the generated ramp."

## 4. Why this is a sell point, not just an implementation detail

Every other token system in wide use (Material, Fluent, Carbon, Spectrum)
either hand-authors its ramps or validates them post-hoc against WCAG
pairwise. Domphy is, to the authors' knowledge, the first to make the
generation step itself *target* the accessibility structure analytically —
the contrast span isn't checked after the fact, it's the thing the warp
curve is shaped to hit. §2's evaluation framework and §3's generator are two
halves of one falsifiable claim: give it any brand color, and the resulting
18-step ramp will — with high, measured probability, not by convention —
already satisfy WCAG 4.5:1 at index distance 9. That claim is testable
(`generator.test.ts` tests it) and re-derivable from first principles (§2.1's
`λ ≈ 0.501` is arithmetic, not a magic number).

## 5. Space axis: spacing, density, size

The spatial half of the system (documented informally in `AGENTS.md` today;
a formal companion paper is planned) follows the same philosophy — few free
parameters, one derived formula, applied uniformly:

```
themeSpacing(n) = calc(n/4 em)      // n = number of U units, U = fontSize/4
themeDensity(l) ∈ { 0.75, 1, 1.5, 2, 2.5 }   // 5-step density scale
themeSize(l, size)                  // 8-step size scale (increase/decrease-N, N ≤ 7)
```

**Component geometry formula** — every bounded control (button, input) at
density `d`, width `w = 1`, line count `n = 1` derives its box from the same
three lines, never a hard-coded pixel value:

```
paddingBlock  = themeSpacing(themeDensity(l) · 1)
paddingInline = themeSpacing(themeDensity(l) · 3)
borderRadius  = themeSpacing(themeDensity(l) · 1)
// height = (6 + 2d) · U — at d = 1.5, that's 9U = 36px, Domphy's canonical button height
```

This is why increasing density on a container (`dataDensity="increase-1"`)
uniformly grows every descendant control's padding, radius, *and* height in
lockstep — they are all functions of the same `d`, not independently tuned
per component.

## 6. Context-aware = adaptive element

The payoff of §2–§5 being formulas instead of fixed values: a Domphy element
does not carry an absolute style. It carries a **position relative to
context**, resolved at read time:

- **Color** — `themeColor(l, tone, color)` resolves `tone` (`"shift-N"`,
  `"increase-N"`, `"base"`, …) against the nearest ancestor's `dataTone`
  (the *surface anchor*). The same `shift-9` element renders a different hex
  depending on whether its container is anchored `shift-0` (light surface)
  or `shift-14` (dark surface) — because it's not asking for a color, it's
  asking for a **relationship** to its surface (§2.1's contrast-span
  guarantee is what makes that relationship safe to assume, not just
  convenient).
- **Density** — `themeDensity(l)` walks up for the nearest `dataDensity`,
  so an entire toolbar can go compact by setting one attribute on its
  container; no descendant control needs to know it happened.
- **Size** — `themeSize(l, size)` composes the same way for typography/icon
  scale.

This is the concrete meaning of "adaptive element": the math in §2–§5 is
what makes context-relative resolution *safe* (accessible, perceptually
uniform) rather than merely convenient. A design token system that is
adaptive but not grounded in this kind of derivation degrades to "it looks
fine to me" the moment the base color or density context changes — Domphy's
does not, because the guarantee (contrast span, geometry ratio) is
structural, not observed.

## References

1. Nguyen, H. K. *A Quantitative Framework for Evaluating Sequential Color
   Palette Quality in Design Systems.* 2026.
   [chromametry/chromametry](https://github.com/chromametry/chromametry),
   [paper.pdf](https://chromametry.github.io/chromametry/paper/paper.pdf).
2. High, G., Green, P., & Nussbaum, P. *The Helmholtz–Kohlrausch effect on
   display-based light colors and simulated substrate colors.* Color
   Research & Application, 48(2):167–177, 2023.
3. Zeileis, A. et al. *Escaping RGBland: Selecting colors for statistical
   graphics.* 2009. (Power-curve palette parameterization, monotone-spline
   motivation.)
4. Fritsch, F. N., & Carlson, R. E. *Monotone piecewise cubic
   interpolation.* SIAM J. Numer. Anal. 17(2), 1980. (The spline in §2.3/§3.3.)
5. Luo, M. R. et al. *The development of the CIE 2000 colour-difference
   formula: CIEDE2000.* 2001. (§2.5's `ΔE₀₀`.)
6. Ottosson, B. *A perceptual color space for image processing (Oklab).*
   2020. (§3.1's interpolation space.)
7. WCAG 2.1, W3C, 2018. (§2.1's 4.5:1 threshold and contrast-ratio formula.)
