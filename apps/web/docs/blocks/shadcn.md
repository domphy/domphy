---
title: "@domphy/blocks — shadcn/ui"
description: "shadcn/ui-sourced blocks (sidebar, auth, dashboard) and chart recipes, clean-room reimplemented for Domphy."
---

# shadcn/ui blocks + chart recipes

97 components clean-room reimplemented from shadcn/ui's public blocks registry (sidebar/auth/dashboard layouts) and chart-recipe gallery (small `@domphy/chart` option presets). See [Methodology](/docs/blocks/methodology) for what "clean-room" means here.

```ts
import { sidebar07, login01, dashboard01, chartBarStacked } from "@domphy/blocks"
```

### auth

| Export | Status | Reference |
|---|---|---|
| `Login01` | ported | [source](https://ui.shadcn.com/blocks) |
| `Login02` | ported | [source](https://ui.shadcn.com/blocks) |
| `Login03` | ported | [source](https://ui.shadcn.com/blocks) |
| `Login04` | ported | [source](https://ui.shadcn.com/blocks) |
| `Login05` | ported | [source](https://ui.shadcn.com/blocks) |
| `signup01` | ported | [source](https://ui.shadcn.com/blocks) |
| `signup02` | ported | [source](https://ui.shadcn.com/blocks) |
| `signup03` | ported | [source](https://ui.shadcn.com/blocks) |
| `signup04` | ported | [source](https://ui.shadcn.com/blocks) |
| `signup05` | ported | [source](https://ui.shadcn.com/blocks) |

### chart-area

| Export | Status | Reference |
|---|---|---|
| `chartAreaAxes` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaDefault` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaGradient` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaIcons` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaInteractive` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaLegend` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaLinear` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaStacked` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaStackedExpand` | partial | [source](https://ui.shadcn.com/charts/area) |
| `chartAreaStep` | partial | [source](https://ui.shadcn.com/charts/area) |

### chart-bar

| Export | Status | Reference |
|---|---|---|
| `chartBarActive` | partial | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarDefault` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarHorizontal` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarInteractive` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarLabel` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarLabelCustom` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarMixed` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarMultiple` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarNegative` | ported | [source](https://ui.shadcn.com/charts/bar) |
| `chartBarStacked` | ported | [source](https://ui.shadcn.com/charts/bar) |

### chart-line

| Export | Status | Reference |
|---|---|---|
| `chartLineDefault` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineDots` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineDotsColors` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineDotsCustom` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineInteractive` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineLabel` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineLabelCustom` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineLinear` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineMultiple` | ported | [source](https://ui.shadcn.com/charts/line) |
| `chartLineStep` | ported | [source](https://ui.shadcn.com/charts/line) |

### chart-pie

| Export | Status | Reference |
|---|---|---|
| `chartPieDonut` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieDonutActive` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieDonutText` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieInteractive` | partial | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieLabel` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieLabelCustom` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieLabelList` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieLegend` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieSeparatorNone` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieSimple` | ported | [source](https://ui.shadcn.com/charts/pie) |
| `chartPieStacked` | ported | [source](https://ui.shadcn.com/charts/pie) |

### chart-radar

| Export | Status | Reference |
|---|---|---|
| `chartRadarDefault` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarDots` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarGrid` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarGridCircle` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarGridCircleFill` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarGridCustom` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarGridFill` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarGridNone` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarIcons` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarLabelCustom` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarLegend` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarLinesOnly` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarMultiple` | ported | [source](https://ui.shadcn.com/charts/radar) |
| `chartRadarRadius` | ported | [source](https://ui.shadcn.com/charts/radar) |

### chart-radial

| Export | Status | Reference |
|---|---|---|
| `chartRadialGrid` | ported | [source](https://ui.shadcn.com/charts/radial) |
| `chartRadialLabel` | ported | [source](https://ui.shadcn.com/charts/radial) |
| `chartRadialShape` | ported | [source](https://ui.shadcn.com/charts/radial) |
| `chartRadialSimple` | ported | [source](https://ui.shadcn.com/charts/radial) |
| `chartRadialStacked` | ported | [source](https://ui.shadcn.com/charts/radial) |
| `chartRadialText` | ported | [source](https://ui.shadcn.com/charts/radial) |

### chart-tooltip

| Export | Status | Reference |
|---|---|---|
| `chartTooltipAdvanced` | partial | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipDefault` | ported | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipFormatter` | ported | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipIcons` | ported | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipIndicatorLine` | ported | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipIndicatorNone` | ported | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipLabelCustom` | ported | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipLabelFormatter` | ported | [source](https://ui.shadcn.com/charts/tooltip) |
| `chartTooltipLabelNone` | ported | [source](https://ui.shadcn.com/charts/tooltip) |

### dashboard

| Export | Status | Reference |
|---|---|---|
| `dashboard01` | complete | [source](https://ui.shadcn.com/blocks#dashboard-01) |

### sidebar

| Export | Status | Reference |
|---|---|---|
| `sidebar01` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar02` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar03` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar04` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar05` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar06` | partial | [source](https://ui.shadcn.com/blocks) |
| `sidebar07` | partial | [source](https://ui.shadcn.com/blocks) |
| `sidebar08` | partial | [source](https://ui.shadcn.com/blocks) |
| `sidebar09` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar10` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar11` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebar12` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebarInDialog` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebarLeftRight` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebarOnRight` | ported | [source](https://ui.shadcn.com/blocks) |
| `sidebarStickyHeader` | ported | [source](https://ui.shadcn.com/blocks) |

