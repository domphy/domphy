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

// Get hex for series index n (0-based):
const color = seriesHex(0)  // → hex string for "primary" at shift-9

// Get hex for a theme family:
const red = familyHex("error")

// Build a palette:
const palette = [0, 1, 2, 3].map(seriesHex)

// Parse rgba string (from themeColor) to hex:
const hex = hexToRgba("#3a4de9")   // → { r, g, b, a }
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
