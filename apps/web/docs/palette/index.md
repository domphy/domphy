# Palette

`@domphy/palette` is Domphy's color-palette quality engine: **measure and validate** sequential color ramps using five perceptual metrics in CIELAB. It is the design-time companion to `@domphy/theme` — theme ships the runtime tokens, palette validates the ramps behind them.

Framework-agnostic, zero dependencies, pure color science. (Ported from the *Chromametry* research project, same author.)

## Install

```bash
npm install @domphy/palette
```

## Measure

`Ramp` / `Palette` score a palette against five metrics (all in CIELAB):

```ts
import { Ramp } from "@domphy/palette"

const ramp = new Ramp(blueHexes, "blue")
ramp.metrics       // { contrastEfficiency, lightnessLinearity, chromaSmoothness, hueStability, spacingUniformity }
ramp.score         // 0–100 (geometric mean of the normalized metrics)
ramp.wcag[45].span // how many steps clear WCAG 4.5:1
```

```ts
import { Palette } from "@domphy/palette"
const palette = new Palette({ blue, red, green })
palette.score // aggregate score across all ramps
```

## Generate

`generateRamp` builds a WCAG-optimized ramp from a base color, so you don't have to hand-pick steps to get a good score:

```ts
import { generateRamp } from "@domphy/palette"

const primary = generateRamp("#4a7ff4", 18)   // 18 hex strings, ready to use
```

See [**generateRamp**](./generator) for the full API and how it composes into `@domphy/theme`'s `generateTheme`.

## Why this matters

Most design systems hand-pick color steps; few can *prove* their palettes are perceptually even and accessible. `@domphy/palette` makes palette quality a measurable property — and `@domphy/theme` is built on top of it.

## Paper

[**Measuring palette quality**](./measuring) — the five metrics, how they're computed, and a benchmark of popular design systems.

[**DESIGN.md**](https://github.com/domphy/domphy/blob/main/DESIGN.md) — the full design-system reference: how `generateRamp`'s warp curve is derived, and how it ties into `@domphy/theme`'s context-aware tone/spacing/size model.
