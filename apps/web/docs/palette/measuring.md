# Paper I — Measuring Palette Quality

A sequential color ramp (e.g. `blue-50` … `blue-900`) is good when it is **perceptually even**, **accessible**, and **artifact-free**. `@domphy/palette` makes that measurable with five metrics, all computed in the **CIELAB** color space (lightness, chroma, hue, and ΔE2000 all derived there).

## The five metrics

Each metric normalizes to `[0, 1]`; `Ramp.score` is the geometric mean, scaled to `0–100`.

1. **Contrast Efficiency** — how efficiently the ramp uses its lightness range to reach a WCAG **4.5:1** contrast pair. A ramp that wastes lightness span (or never reaches 4.5:1) scores low.
2. **Lightness Linearity** — how linear the lightness progression is across the steps, with a **Helmholtz–Kohlrausch** correction (so highly-chromatic steps that *look* lighter are accounted for). Even visual steps → high score.
3. **Chroma Smoothness** — detects kinks and artifacts in the saturation curve using **monotone cubic splines**. A smooth chroma arc scores high; a jagged one (a step that suddenly desaturates) scores low.
4. **Hue Stability** — quantifies hue drift across the lightness ramp. A ramp that stays "the same color" from light to dark scores high; one that shifts hue (blue → purple at the dark end) scores low.
5. **Spacing Uniformity** — consistency of perceptual spacing between adjacent steps, measured with **ΔE2000**. Evenly-spaced steps score high.

```ts
import { Ramp } from "@domphy/palette"

const ramp = new Ramp(blueHexes, "blue")
ramp.metrics   // { contrastEfficiency, lightnessLinearity, chromaSmoothness, hueStability, spacingUniformity }
ramp.score     // 0–100
```

## Benchmark of design systems

Popular design systems, scored on these metrics (algorithmic sequential ramps only — systems that ship discrete semantic tokens rather than ramps, like Bootstrap or Material 3, are excluded). **Overall Score** is the geometric mean of the five normalized metrics.

| Design System | Steps | Span (K) | Contrast Eff. | Lightness Lin. | Chroma Smooth. | Hue Stab. | Spacing Unif. | **Score** |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Adobe Spectrum | 18 | 9 | 0.943 | 0.933 | 0.879 | 0.914 | 0.772 | **88.6** |
| IBM Carbon | 12 | 6 | 0.911 | 0.930 | 0.869 | 0.929 | 0.792 | **88.5** |
| U.S. Web Design System | 12 | 6 | 0.911 | 0.936 | 0.810 | 0.938 | 0.800 | **87.7** |
| Salesforce Lightning 2 | 14 | 7 | 0.925 | 0.919 | 0.846 | 0.937 | 0.711 | **86.3** |
| GitHub Primer Brand | 12 | 6 | 0.911 | 0.924 | 0.841 | 0.941 | 0.684 | **85.5** |
| Atlassian | 14 | 8 | 0.771 | 0.896 | 0.909 | 0.947 | 0.713 | **84.2** |
| Tailwind CSS | 13 | 8 | 0.756 | 0.871 | 0.857 | 0.915 | 0.678 | **81.0** |
| Ant Design | 12 | 9 | 0.665 | 0.859 | 0.873 | 0.928 | 0.655 | **78.8** |
| Material UI | 12 | 11 | 0.507 | 0.797 | 0.786 | 0.924 | 0.550 | **69.4** |
| Radix UI | 13 | 10 | 0.474 | 0.798 | 0.768 | 0.947 | 0.521 | **67.8** |
| Shopify Polaris | 17 | 15 | 0.282 | 0.728 | 0.689 | 0.922 | 0.467 | **57.2** |

## Where Domphy sits

`@domphy/theme` builds on **Adobe Spectrum-derived 18-step ramps** — the top-scoring family in the benchmark — and `@domphy/palette` lets you *verify* that, or any palette you generate, before shipping:

```ts
import { Palette } from "@domphy/palette"
const score = new Palette({ blue, red, green }).score
if (score < 80) console.warn("palette quality below target")
```

Run it in CI to keep a design system's palettes measurably accessible over time.
