---
title: "Ramp"
description: "The Ramp class: accessing raw data, step-by-step inspection, metrics, and the Palette aggregate class."
---

# Ramp

`Ramp` is the core analysis unit. It wraps an ordered array of hex strings and computes every perceptual property of that scale: CIELAB metrics, contrast spans, raw swatch data, and a composite score. `Palette` wraps multiple named ramps and aggregates the same properties across them.

## Constructor

```ts
import { Ramp } from "@domphy/palette"

const ramp = new Ramp(hexColors, "blue")
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `colors` | `string[]` | `[]` | Ordered hex strings. Convention is lightest → darkest, but reversed ramps work too. |
| `name` | `string` | `"brand"` | Human-readable label used in `Palette` output and debug logs. |

A ramp needs at least 8–10 steps to produce reliable chroma and hue metrics. With fewer than 3 steps, those metrics fall back to 1 (no signal).

## Raw data

### `ramp.colors`

The original hex strings in input order.

```ts
ramp.colors  // ["#ffffff", "#dce8fd", "#b9d2fb", … "#000000"]
ramp.steps   // 18
```

### `ramp.swatches`

`Swatch[]` — one per color. Each swatch exposes full CIELAB, LCH, perceptual lightness, and relative luminance. See [Swatch & Color Utilities](./swatch) for the full property list.

```ts
const s = ramp.swatches[6]   // e.g. the swatch at hex #3b82f6

s.hex        // "#3b82f6"
s.rgb        // [0.0438, 0.2233, 0.9216]  — linear sRGB, channels in [0, 1]
s.lab        // [55.63, 17.5, -64.5]     — CIELAB [L, a, b]
s.lch        // [55.63, 66.77, 285.23]   — LCH [L, C, hue°]
s.lightness  // 73.23  — L_EAL (perceptual brightness, Helmholtz–Kohlrausch corrected)
s.chroma     // 66.77  — LCH chroma
s.hue        // 285.23 — hue angle in degrees
s.luminance  // 0.2355 — relative luminance for WCAG contrast
```

## Identity

### `ramp.baseColor`

The hex of the most chromatic inner swatch (index 2 through `steps − 3`). This is the swatch a design system would expose as the "representative" shade — e.g. the one labelled `blue-500`. For achromatic ramps where peak chroma is below 6, it falls back to the middle step.

```ts
ramp.baseColor   // "#3b82f6"
```

### `ramp.baseIndex`

The index of `baseColor` in `ramp.colors`.

```ts
ramp.baseIndex   // 6
ramp.colors[ramp.baseIndex]  // "#3b82f6"
```

### `ramp.peakChroma`

Also the hex of the highest-chroma inner swatch. This is the same source as `baseColor`; it is exposed as a separate getter for contexts where you want the hex without going through `baseColor`.

```ts
ramp.peakChroma   // "#3b82f6"
```

## Intermediate curves

These getters expose the raw data that the quality metrics are computed from. Useful for building visualizations or custom validators.

### `ramp.deltaECurve`

Cumulative ΔE2000 distance starting from the first swatch. The first value is always `0`; each subsequent value adds the ΔE2000 distance from the previous step.

```ts
ramp.deltaECurve
// [0, 8.3, 16.9, 25.2, 33.8, 42.1, 51.0, …]
```

A perfectly uniform ramp produces a straight line. Kinks indicate uneven perceptual spacing — the same signal that drives `spacingUniformity`.

### `ramp.unwrapHues`

Hue angles (LCH) for the *inner* steps only — `swatches[1]` through `swatches[steps − 2]` — with 360° wraparound discontinuities removed. First and last swatches are excluded because white and black have undefined or meaningless hues.

```ts
ramp.unwrapHues
// [280.1, 282.4, 284.7, 285.2, 285.1, 284.0, …]  (stable blue ramp)
```

Without unwrapping, a hue that passes through 0°/360° would produce a false spike in hue-drift analysis. The array index corresponds to the inner swatch number: index 0 = `swatches[1]`.

## Metrics

Each metric is a `number` in `[0, 1]`. Higher is better. See [Measuring Palette Quality](./measuring) for the theoretical background and benchmark data.

### Individual getters

```ts
ramp.contrastEfficiency   // how few steps needed to guarantee WCAG 4.5:1
ramp.lightnessLinearity   // linearity of the L_EAL progression
ramp.chromaSmoothness     // absence of kinks in the chroma curve
ramp.hueStability         // absence of hue drift across the scale
ramp.spacingUniformity    // evenness of ΔE2000 gaps between steps
```

### `ramp.metrics`

All five at once as a plain object:

```ts
ramp.metrics
// {
//   contrastEfficiency: 0.923,
//   lightnessLinearity: 0.951,
//   chromaSmoothness:   0.887,
//   hueStability:       0.942,
//   spacingUniformity:  0.831,
// }
```

### `ramp.score`

Geometric mean of the five metrics, scaled to 0–100.

```ts
ramp.score   // e.g. 90.7
```

The [benchmark](./measuring#benchmark-of-design-systems) shows top design systems score 85–89. Below 80 usually indicates a visible artifact in at least one metric.

## Contrast spans

Brief summary here — full documentation in [Accessibility & Contrast](./accessibility).

```ts
ramp.wcag[45].span   // min step gap to guarantee WCAG AA (4.5:1) everywhere
ramp.wcag[45].value  // actual worst-case ratio at that span
ramp.apca[60].span   // min step gap to guarantee APCA Lc 60 everywhere
```

`wcag` has three levels: `30` (3:1), `45` (4.5:1), `70` (7:1).
`apca` has three levels: `45`, `60`, `75` (Lc values).

## The `Palette` class

`Palette` wraps multiple named ramps and aggregates every metric across them.

```ts
import { Palette } from "@domphy/palette"
import type { PaletteColors } from "@domphy/palette"

const colors: PaletteColors = {
  blue:  blueHexes,
  red:   redHexes,
  green: greenHexes,
}

const palette = new Palette(colors, "brand-v2")
```

`PaletteColors` is `Record<string, string[]>` — a plain object mapping ramp names to hex arrays.

### Accessing ramps

```ts
palette.ramps          // Ramp[]
palette.ramps[0].name  // "blue"
palette.colors         // { blue: [...], red: [...], green: [...] }
palette.steps          // step count taken from the first ramp
```

### Aggregate metrics

Each metric is the **root-mean-square** (RMS) across all ramps. RMS penalizes outlier ramps more than a simple average — a single bad ramp pulls the score down noticeably.

```ts
palette.contrastEfficiency
palette.lightnessLinearity
palette.chromaSmoothness
palette.hueStability
palette.spacingUniformity
palette.score   // 0–100, geometric mean of the five aggregate metrics
```

### Per-ramp breakdown

```ts
for (const ramp of palette.ramps) {
  const m = ramp.metrics
  console.log(
    ramp.name,
    `score=${ramp.score.toFixed(1)}`,
    `CE=${(m.contrastEfficiency * 100).toFixed(0)}%`,
    `LL=${(m.lightnessLinearity * 100).toFixed(0)}%`,
  )
}
// blue   score=90.7  CE=92%  LL=95%
// red    score=88.3  CE=89%  LL=93%
// green  score=86.1  CE=87%  LL=91%
```

### Palette-level contrast

`palette.wcag` and `palette.apca` aggregate across ramps: `span` is the **worst ramp** (maximum), `value` is the **average** across ramps. See [Accessibility & Contrast](./accessibility).

```ts
palette.wcag[45].span    // worst ramp's AA span
palette.wcag[45].value   // average ratio at that span across all ramps
```

## CI quality gate

```ts
import { Palette } from "@domphy/palette"

const palette = new Palette({ blue, red, green, yellow }, "brand")

if (palette.score < 85) {
  console.error(`Overall score ${palette.score.toFixed(1)} is below target 85`)
  process.exit(1)
}

// Show which specific metric is dragging the score down
for (const ramp of palette.ramps) {
  if (ramp.score < 85) {
    const m = ramp.metrics
    const lowest = Object.entries(m)
      .sort(([, a], [, b]) => a - b)[0]
    console.error(`${ramp.name} (${ramp.score.toFixed(1)}): weakest metric = ${lowest[0]} (${(lowest[1] * 100).toFixed(1)}%)`)
  }
}
```
