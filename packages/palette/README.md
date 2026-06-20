# @domphy/palette

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/palette/) · [npm](https://www.npmjs.com/package/@domphy/palette)

Domphy's color-palette quality engine. **Validates** palette quality with five color-science metrics computed in CIELAB — framework-agnostic, zero runtime dependencies.

## Install

```bash
npm install @domphy/palette
```

## Validate a ramp

```ts
import { Ramp } from "@domphy/palette"

const r = new Ramp(["#ffffff", "#dbeafe", "#3b82f6", "#1d4ed8", "#000000"], "blue")

r.score    // 0–100 geometric-mean quality score
r.metrics  // { lightnessLinearity, chromaSmoothness, spacingUniformity, hueStability, contrastEfficiency }
r.wcag     // WCAG contrast-span analysis
r.apca     // APCA contrast-span analysis
```

The five metrics (each normalized to `0..1`):

| Metric | Measures |
|---|---|
| `contrastEfficiency` | How efficiently the ramp spans usable contrast steps. |
| `lightnessLinearity` | How linearly perceived lightness progresses. |
| `chromaSmoothness` | How smoothly chroma rises and falls around its peak. |
| `hueStability` | How stable hue stays relative to the base color. |
| `spacingUniformity` | How evenly steps are spaced (CIEDE2000). |

## Aggregate a palette

```ts
import { Palette } from "@domphy/palette"

const palette = new Palette({
  blue:  ["#ffffff", ..., "#000000"],
  green: ["#ffffff", ..., "#000000"],
})

palette.score   // RMS-aggregated score across all ramps
palette.colors  // { blue: [...], green: [...] }
```

## Color math utilities

CIELAB / Oklab / CIEDE2000 helpers exported for direct use:
`hexToRgb`, `rgbToLab`, `labToLch`, `rgbToOklab`, `calcDeltaE2000`, `createMonotone`, …
