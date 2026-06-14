# @domphy/palette

Domphy's color-palette engine. It **generates** perceptually-uniform color ramps from one or more anchor colors and **validates** palette quality with five color-science metrics computed in CIELAB.

This package ports the [chromametry](https://github.com/) color-science project (MIT, same author): the metrics core (`Swatch` / `Ramp` / `Palette`) plus the ramp generator (`generateRamp`) and its parameter optimizer (`optimize`). The generator runs in **pure JS** — the optional WASM backend from the upstream project is not bundled here.

Like the rest of Domphy's headless packages (query, table, router, virtual), this is framework-agnostic color math with **zero runtime dependencies** and no `@domphy/core` dependency.

## Install

```bash
npm install @domphy/palette
```

## Generate a ramp

```ts
import { generateRamp } from "@domphy/palette"

// One anchor → an 11-step ramp from white to black through the anchor.
const ramp = generateRamp("#3b82f6", 11)
// → ["#ffffff", "#dbeafe", ... , "#1d4ed8", ... , "#000000"]

// Multiple anchors are honored in lightness order.
const custom = generateRamp(["#fef3c7", "#f59e0b", "#7c2d12"], 9)
```

`generateRamp(hexs, stepsCount)` accepts a single hex string or an array of hex anchors and returns `stepsCount` sRGB hex strings.

## Validate a ramp

```ts
import { Ramp } from "@domphy/palette"

const r = new Ramp(generateRamp("#3b82f6", 18), "blue")

r.score              // 0–100 geometric-mean quality score
r.metrics            // { lightnessLinearity, chromaSmoothness, spacingUniformity, hueStability, contrastEfficiency }
r.contrasts          // { wcag, apca } contrast-span analysis
```

The five metrics (each normalized to `0..1`) are:

| Metric | Measures |
| --- | --- |
| `contrastEfficiency` | How efficiently the ramp spans usable contrast steps. |
| `lightnessLinearity` | How linearly perceived lightness (L_EAL) progresses. |
| `chromaSmoothness` | How smoothly chroma rises and falls around its peak. |
| `hueStability` | How stable hue stays relative to the base color. |
| `spacingUniformity` | How evenly steps are spaced (CIEDE2000). |

## Aggregate a palette

```ts
import { Palette } from "@domphy/palette"

const palette = new Palette({
  blue: generateRamp("#3b82f6", 18),
  green: generateRamp("#22c55e", 18),
})

palette.score        // RMS-aggregated score across all ramps
palette.colors       // { blue: [...], green: [...] }
```

## Tune the generator

```ts
import { optimize } from "@domphy/palette"

// Deterministic grid + local search over the warp parameters (p, q).
const best = optimize()
// → { p, q, avgScore, coverage, exact, spanError }
```

## Color math

The CIELAB / Oklab / CIEDE2000 conversion helpers (`hexToRgb`, `rgbToLab`, `labToLch`, `rgbToOklab`, `calcDeltaE2000`, `createMonotone`, …) are also exported for direct use.
