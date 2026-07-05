---
title: "@domphy/blocks — hexagonPattern"
description: "Full clean-room reimplementation: <svg><defs><pattern> tile containing either closed hexagon polygons (solid) or 6 per-edge <line> segments (strokeDasharray..."
---

# hexagonPattern

<script setup lang="ts">
import HexagonPatternDemo from "../demos/blocks/hexagonPattern.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `hexagonPattern()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="HexagonPatternDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `radius` | `number` | Hexagon radius, center to vertex, in SVG user units. Defaults to `40`. |
| `gap` | `number` | Extra spacing added between adjacent hexagons, in user units. Defaults to `0`. |
| `x` | `number` | Pattern origin horizontal offset, in user units. Defaults to `-1`. |
| `y` | `number` | Pattern origin vertical offset, in user units. Defaults to `-1`. |
| `direction` | `HexagonPatternDirection` | `"horizontal"` renders flat-top hexagons (flat edges up/down); `"vertical"` renders pointy-top hexagons (a vertex up/down). Defaults to `"horizontal"`. |
| `hexagons` | `Array&lt;[number, number]&gt;` | `[column, row]` coordinates of cells to render as solid highlighted hexagons, layered above the outline tile. Defaults to a small demo set. |
| `strokeDasharray` | `string` | Switches outline rendering from a closed polygon to per-edge dashed line segments (e.g. `"4 2"`). Solid closed polygons are used when omitted. |
| `color` | `ThemeColor` | Theme color family for the outline stroke. Defaults to `"neutral"`. |
| `highlightColor` | `ThemeColor` | Theme color family for highlighted cells. Defaults to `"primary"`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the pattern. Defaults to a small demo panel. |
| `style` | `StyleObject` | Passthrough style merged onto the outer demo wrapper. |

::: details Implementation notes
Full clean-room reimplementation: &lt;svg&gt;&lt;defs&gt;&lt;pattern&gt; tile containing either closed hexagon polygons (solid) or 6 per-edge &lt;line&gt; segments (strokeDasharray set), plus a fill-url(#pattern) &lt;rect&gt;, plus extra highlighted-cell &lt;polygon&gt;s layered on top, all using tags already namespace-safe in @domphy/core (svg/defs/pattern/polygon/line/rect/g). Own-derived single-tile hex-grid geometry (3 hexagon instances per tile: one full + two seam-straddling halves) for both flat-top ('horizontal') and pointy-top ('vertical') orientation, matching the spec's every-other-row/column half-step interlock. Stroke uses currentColor (svg root's `color` set via themeColor) rather than per-element themeColor calls, avoiding doctor's missing-color rule entirely for the outline tile; highlighted cells do use themeColor for fill and are `_doctorDisable: missing-color` (decorative, no text), matching the meteors()/dottedMap() convention already in this package. Deviation from spec: the exported factory returns a self-sized demo wrapper (dataTone shift-1 panel with default heading+paragraph foreground content, overridable via `children`) rather than a bare position:absolute layer with no intrinsic size — necessary so `hexagonPattern()` with zero args is actually visible/screenshot-able per this package's factory-function contract; callers who just want the raw pattern layer can lift the inner &lt;svg&gt; out. `direction` default ('horizontal'/flat-top) and the demo `hexagons` highlight set are this port's own judgment calls (spec's research note didn't state a direction default). doctor CLI: 0 diagnostics.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/hexagon-pattern)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/hexagonPattern.ts [hexagonPattern]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
