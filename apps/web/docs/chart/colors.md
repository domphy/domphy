---
title: "Colors & Theme"
description: "Series color palette, theme families, gradient fills, and the visual map color utility in @domphy/chart."
---

# Colors & Theme

## Series palette

Series are colored by cycling through Domphy theme families in order:

```
primary → secondary → success → warning → error → info → highlight → attention → danger
```

Each family is resolved at tone `shift-9` — a concrete hex color (no CSS variable). This means charts render correctly in both light and dark theme without any configuration.

Override a specific series color:

```ts
series: [
  { type: "bar", data: [...], color: "success" },      // ThemeFamily string
  { type: "bar", data: [...], color: "error" },
]
```

`color` accepts any `ThemeFamily` value: `"primary" | "secondary" | "success" | "warning" | "error" | "info" | "highlight" | "attention" | "danger"`.

## Gradient fills

`areaStyle.color` on line series supports gradient fills:

```ts
import type { GradientObject } from "@domphy/chart"

areaStyle: {
  color: {
    type: "linear",
    x: 0, y: 0,      // start point (0,0 = top-left)
    x2: 0, y2: 1,    // end point (0,1 = bottom of element)
    colorStops: [
      { offset: 0, color: "rgba(58, 77, 233, 0.8)" },
      { offset: 1, color: "rgba(58, 77, 233, 0.05)" },
    ],
  },
}
```

**Types:**

```ts
interface ColorStop {
  offset: number    // 0–1 along the gradient
  color: string     // any CSS color string
}

interface LinearGradient {
  type: "linear"
  x: number; y: number; x2: number; y2: number  // 0–1, fraction of element bounding box
  colorStops: ColorStop[]
  global?: boolean  // interpret coords in global SVG space
}

interface RadialGradient {
  type: "radial"
  x: number; y: number   // center, 0–1 fractions
  r: number              // radius, 0–1 fraction
  colorStops: ColorStop[]
  global?: boolean
}

type GradientObject = LinearGradient | RadialGradient
```

All four types are exported from `@domphy/chart`.

**Common gradient patterns:**

```ts
// Top-to-bottom fade (most common for area charts):
{ type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [...] }

// Left-to-right:
{ type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [...] }

// Radial glow:
{ type: "radial", x: 0.5, y: 0.5, r: 0.5, colorStops: [...] }
```

## Color utilities

```ts
import { hexToRgba, seriesHex, seriesRgba, familyHex, familyRgba, seriesPaletteFamily } from "@domphy/chart"
```

| Function | Signature | Description |
|---|---|---|
| `seriesHex(index)` | `(index: number) => string` | Hex color for series `index` (0-based, cycles through theme palette) |
| `seriesRgba(index, alpha?)` | `(index: number, alpha?: number) => Rgba` | RGBA object for series `index`. `alpha` defaults to `1`. |
| `familyHex(family)` | `(family: ThemeFamily) => string` | Hex color for a named theme family (e.g. `"error"`, `"success"`) |
| `familyRgba(family, tone?, alpha?)` | `(family: ThemeFamily, tone?: number, alpha?: number) => Rgba` | RGBA for a theme family at an optional tone level |
| `seriesPaletteFamily(index)` | `(index: number) => ThemeFamily` | Maps a series index to its backing `ThemeFamily` (cycles: primary → info → success → warning → error → …) |
| `hexToRgba(hex)` | `(hex: string) => Rgba` | Parse a hex/rgb string to `{ r, g, b, a }` |

```ts
// Get hex for series index n (0-based):
const color = seriesHex(0)  // hex string (primary at default tone)

// Get RGBA with custom alpha (e.g. for fill opacity in area charts):
const fill = seriesRgba(0, 0.15)  // { r, g, b, a: 0.15 }

// Get hex for a theme family:
const red = familyHex("error")

// Get RGBA for a theme family:
const rgba = familyRgba("error", 9, 1)  // { r, g, b, a: 1 }

// Which ThemeFamily backs series index 2?
const family = seriesPaletteFamily(2)  // e.g. "success"

// Build a palette:
const palette = [0, 1, 2, 3].map(seriesHex)

// Parse a hex string to RGBA object:
const rgba2 = hexToRgba("#3a4de9")  // { r: 58, g: 77, b: 233, a: 1 }
```

## VisualMap colors

When using `visualMap`, use `colorFromVisualMap` to resolve a data value to its mapped color:

```ts
import { colorFromVisualMap } from "@domphy/chart"
import type { VisualMapOption } from "@domphy/chart"

const vm: VisualMapOption = {
  type: "continuous",
  min: 0,
  max: 100,
}

const color = colorFromVisualMap(vm, 75)  // → interpolated hex string
```

## Per-item colors

Override the color of individual data points using `itemStyle.color`:

```ts
series: [{
  type: "bar",
  data: [
    120,
    { value: 200, itemStyle: { color: "#ff4444" } },   // highlight one bar
    150,
    { value: 80,  itemStyle: { color: "#44bb44" } },
  ],
}]
```

For pie charts, each slice gets its own color automatically from the series palette. Override per slice:

```ts
series: [{
  type: "pie",
  data: [
    { value: 40, name: "A" },
    { value: 30, name: "B", itemStyle: { color: "#e65" } },
    { value: 30, name: "C" },
  ],
}]
```

## Dark mode

All theme family colors (`"primary"`, `"secondary"`, etc.) resolve to concrete hex at render time using the current theme tone. When `data-theme="dark"` is set on a parent element, the colors automatically shift to their dark-mode equivalents — no extra config.

Setting `dataTone` on the chart container shifts the entire chart's color family:

```ts
const App = {
  div: null,
  dataTone: "shift-14",   // dark edge anchor — all chart colors adapt
  style: { width: "600px", height: "300px", position: "relative" },
  $: [chart(option)],
}
```
