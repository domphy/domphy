---
title: "Geo & Maps"
description: "Geo coordinate system and registerMap in @domphy/chart."
---

# Geo & Maps

## No built-in map — always call registerMap

`@domphy/chart` ships no GeoJSON data. There is no built-in `"world"` map — `map: "world"` (or any other name) silently no-ops until you call `registerMap` with that exact name first. The map registry starts empty.

Use a registered map in:
- `map` series (choropleth) — fill regions by value
- `geo` option — base layer for overlaying other series
- `lines` series with `coordinateSystem: "geo"` — draw flight paths / connections
- `effectScatter` with `coordinateSystem: "geo"` — animated point scatter on map

```ts
import { chart, registerMap } from "@domphy/chart"
import type { ChartOption } from "@domphy/chart"

// Register a GeoJSON FeatureCollection first — e.g. world countries from naturalearth
const response = await fetch("/maps/world.geojson")
const worldGeoJSON = await response.json()
registerMap("world", worldGeoJSON)

const option: ChartOption = {
  series: [
    {
      type: "map",
      map: "world",
      data: [
        { name: "United States", value: 320 },
        { name: "China", value: 580 },
        { name: "Brazil", value: 210 },
      ],
    },
  ],
  visualMap: {
    type: "continuous",
    min: 0,
    max: 600,
    inRange: { color: ["#e0f3f8", "#0077bb"] },
  },
}
```

## Custom GeoJSON (registerMap)

Import `registerMap` from `@domphy/chart` and call it **before** rendering the chart, for any map name — including `"world"`. The `geoJSON` argument must be a standard GeoJSON `FeatureCollection`.

```ts
import { registerMap } from "@domphy/chart"

const response = await fetch("/maps/vietnam.geojson")
const geoJSON = await response.json()
registerMap("vietnam", geoJSON)

// Then use:
// series: [{ type: "map", map: "vietnam", data: [...] }]
```

Register as many maps as needed — each name is an independent key in the registry. Names are case-sensitive.

## Geo coordinate option

The `geo` option creates a standalone coordinate system that other series can reference with `coordinateSystem: "geo"`. This is the standard way to overlay `lines`, `effectScatter`, or `scatter` on top of a map. `geo.map` must already be registered via `registerMap`.

```ts
registerMap("world", worldGeoJSON) // must run before this option is applied

const option: ChartOption = {
  geo: {
    map: "world",
    center: [105, 16], // [lng, lat] — centers on Southeast Asia
    zoom: 4,
    roam: false,       // interactive pan/zoom not yet supported
    itemStyle: {
      areaColor: "#e6e6e6",
      borderColor: "#999",
    },
  },
  series: [
    {
      type: "lines",
      coordinateSystem: "geo",
      data: [
        {
          coords: [
            [106.6, 10.8], // Ho Chi Minh City [lng, lat]
            [100.5, 13.7], // Bangkok
          ],
        },
      ],
      lineStyle: { color: "primary", width: 2, curveness: 0.2 },
    },
    {
      type: "effectScatter",
      coordinateSystem: "geo",
      data: [
        { name: "Ho Chi Minh City", value: [106.6, 10.8, 80] },
        { name: "Bangkok", value: [100.5, 13.7, 60] },
        { name: "Singapore", value: [103.8, 1.35, 95] },
      ],
      encode: { value: 2 },
      rippleEffect: { brushType: "stroke" },
    },
  ],
}
```

### geo options

| Option | Type | Description |
|--------|------|-------------|
| `map` | `string` | Map name — must be registered first via `registerMap` |
| `center` | `[number, number]` | `[longitude, latitude]` of the center point |
| `zoom` | `number` | Zoom multiplier — `1` fits the map to the container |
| `roam` | `boolean` | Interactive pan/zoom — not yet supported, keep `false` |
| `itemStyle` | `object` | Style for each region polygon |
| `label` | `object` | Region label display options |

## Map series (choropleth)

The `map` series fills regions by value — classic choropleth. `map` must already be registered via `registerMap`.

```ts
registerMap("world", worldGeoJSON) // must run before this option is applied

const option: ChartOption = {
  series: [
    {
      type: "map",
      map: "world",
      nameMap: {
        "USA": "United States",
        "UK": "United Kingdom",
      },
      data: [
        { name: "United States", value: 320 },
        { name: "China", value: 580 },
        { name: "Germany", value: 140 },
        { name: "Brazil", value: 210 },
      ],
      emphasis: {
        itemStyle: { areaColor: "#ffd700" },
      },
    },
  ],
  visualMap: {
    type: "piecewise",
    pieces: [
      { min: 0,   max: 100, label: "Low",    color: "#cce5ff" },
      { min: 100, max: 300, label: "Medium", color: "#66b3ff" },
      { min: 300,           label: "High",   color: "#0055cc" },
    ],
  },
  tooltip: { trigger: "item" },
}
```

**`nameMap`** — use when your data uses different country/region names than the GeoJSON `name` properties. Keys are your data names; values are the GeoJSON feature names.

## Projection & coordinates

- Built-in projection is **Mercator** — not configurable.
- GeoJSON coordinates must be **WGS84** `[longitude, latitude]` pairs (standard GeoJSON spec).
- `geo.center` uses `[longitude, latitude]` — **longitude first**, same as GeoJSON.
- `geo.zoom` is a plain multiplier: `1` = fit entire map to container, `2` = 2× zoom in, `0.5` = 2× zoom out.
- Data coordinates for `effectScatter`/`scatter` on geo: `value: [longitude, latitude, optionalSize]`.

## getRegisteredMap

After registering a custom map, retrieve the GeoJSON back with `getRegisteredMap`:

```ts
import { registerMap, getRegisteredMap } from "@domphy/chart"

registerMap("vietnam", geoJSON)

const stored = getRegisteredMap("vietnam")
// → the same GeoJSON FeatureCollection you passed in
// Returns undefined if the name was never registered
```

Useful for verifying a map was registered, or for reusing the GeoJSON in other parts of your app (e.g. custom SVG overlays) without keeping a separate reference.
