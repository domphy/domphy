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

Each family is resolved at tone `shift-9`. The recommended path is `seriesColor(index)` / `familyCss(family)` — `themeColor()` `var(--…)` refs that follow `[data-theme]` at paint time. `seriesHex` / `familyHex` return a static light-theme hex (no CSS variable) for design-time use.

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

Barrel exports from `@domphy/chart`:

```ts
import {
  createColorResolver,
  cssColor,
  familyCss,
  familyHex,
  familyRgba,
  hexToRgba,
  seriesColor,
  seriesHex,
  seriesPaletteFamily,
  seriesRgba,
} from "@domphy/chart"
import type { ColorResolver, Rgba } from "@domphy/chart"

// type Rgba = [number, number, number, number]  // channels ÷ 255, range 0–1
```

`seriesPaletteFamily` cycles the same `SERIES_PALETTE` order as [Series palette](#series-palette).

| Function | Signature | Description |
|---|---|---|
| `seriesColor(index)` | `(index: number) => string` | Recommended. `var(--…)` ref for series `index` at `shift-9` |
| `familyCss(family, tone?)` | `(family: ThemeFamily, tone?: string) => string` | Recommended. `var(--…)` ref for a family. Default tone `"shift-9"` |
| `cssColor(src, fallbackIndex)` | `(src: unknown, fallbackIndex: number) => string` | Paint-safe CSS: family → var ref; hex/rgb/var pass through; else palette fallback |
| `createColorResolver(el)` | `(el: HTMLElement) => ColorResolver` | Per-pass resolver: `.css(src, fallbackIndex)` for SVG/HTML; `.rgba(src, fallbackIndex, alpha?)` for WebGL floats |
| `seriesHex(index)` | `(index: number) => string` | Static light-theme hex for series `index` (design-time) |
| `familyHex(family, tone?)` | `(family: ThemeFamily, tone?: string) => string` | Static light-theme hex. Default tone `"shift-9"` |
| `seriesRgba(index, alpha?)` | `(index: number, alpha?: number) => Rgba` | `Rgba` tuple for series `index`. `alpha` defaults to `1` |
| `familyRgba(family, tone?, alpha?)` | `(family: ThemeFamily, tone?: string, alpha?: number) => Rgba` | `Rgba` tuple. Default `tone = "shift-9"`, `alpha = 1` |
| `seriesPaletteFamily(index)` | `(index: number) => ThemeFamily` | Maps series `index` to its backing family (cycles `SERIES_PALETTE`) |
| `hexToRgba(hex, alpha?)` | `(hex: string, alpha?: number) => Rgba` | Parse `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa` to a `Rgba` tuple |

```ts
const color = seriesColor(0)              // var(--…) ref (primary at shift-9)
const hex = seriesHex(0)                  // static light-theme hex
const fill = seriesRgba(0, 0.15)          // [r, g, b, 0.15]  channels in 0–1
const red = familyHex("error")
const css = familyCss("error")            // var(--…) ref
const rgba = familyRgba("error", "shift-9", 1)
const family = seriesPaletteFamily(2)     // "success"
const palette = [0, 1, 2, 3].map(seriesColor)
const parsed = hexToRgba("#3a4de9")       // [58/255, 77/255, 233/255, 1]
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

`seriesColor` / `familyCss` / `cssColor` emit `var(--…)` refs. SVG/HTML layers follow `[data-theme]` at paint time. The `chart()` patch re-renders on theme flips so WebGL uniforms re-resolve through `createColorResolver`. `seriesHex` / `familyHex` / `seriesRgba` / `familyRgba` stay static light-theme values.

Setting `dataTone` on the chart container shifts the entire chart's color family:

```ts
const App = {
  div: null,
  dataTone: "shift-14",   // dark edge anchor — all chart colors adapt
  style: { width: "600px", height: "300px", position: "relative" },
  $: [chart(option)],
}
```
