# Palette

`@domphy/palette` is Domphy's color-palette engine: it **generates** accessible sequential color ramps and **measures** their quality. It is the design-time companion to `@domphy/theme` — theme ships the runtime tokens, palette generates and validates the ramps behind them.

Framework-agnostic, zero dependencies, pure color science in CIELAB. (Ported from the *Chromametry* research project, same author.)

## Install

```bash
npm install @domphy/palette
```

## Generate

`generateRamp(seedHexes, steps)` produces a perceptually-even, WCAG-aware ramp:

```ts
import { generateRamp } from "@domphy/palette"

const blue = generateRamp(["#3b82f6"], 18) // 18 hex stops, white → color → black
```

`optimize()` searches the generator's warp parameters against the quality metrics — it's how the built-in defaults were tuned.

## Measure

`Ramp` / `Palette` score a palette against five metrics (all in CIELAB):

```ts
import { Ramp } from "@domphy/palette"

const ramp = new Ramp(blue, "blue")
ramp.metrics       // { contrastEfficiency, lightnessLinearity, chromaSmoothness, hueStability, spacingUniformity }
ramp.score         // 0–100 (geometric mean of the normalized metrics)
ramp.wcag[45].span // how many steps clear WCAG 4.5:1
```

```ts
import { Palette } from "@domphy/palette"
const palette = new Palette({ blue, red, green })
palette.score // aggregate score across all ramps
```

## Why this matters

Most design systems hand-pick color steps; few can *prove* their palettes are perceptually even and accessible. `@domphy/palette` makes palette quality a measurable, optimizable property — and `@domphy/theme` is built on top of it.

## The two papers

1. [**Measuring palette quality**](./measuring) — the five metrics, how they're computed, and a benchmark of popular design systems.
2. [**Generating accessible palettes**](./generating) — how the ramp generator produces even, WCAG-aware ramps, and how it's tuned.
