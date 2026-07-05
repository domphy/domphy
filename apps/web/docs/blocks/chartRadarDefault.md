---
title: "@domphy/blocks — chartRadarDefault"
description: "Drawn as raw SVG (shared geometry/tooltip helpers in src/shadcn/charts/chart-radar-shared.ts) instead of routed through @domphy/chart's WebGL RadarRenderer,..."
---

# chartRadarDefault

<script setup lang="ts">
import ChartRadarDefaultDemo from "../demos/blocks/chartRadarDefault.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartRadarDefault()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartRadarDefaultDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `RadarPoint[]` | — |
| `series` | `RadarSeriesConfig[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendText` | `string` | — |
| `trendDirection` | `ChartTrendDirection` | — |
| `captionText` | `string` | — |
| `fillOpacity` | `number` | — |
| `showDots` | `boolean` | — |

::: details Implementation notes
Drawn as raw SVG (shared geometry/tooltip helpers in src/shadcn/charts/chart-radar-shared.ts) instead of routed through @domphy/chart's WebGL RadarRenderer, because packages/chart/src/engine.ts explicitly skips `type: "radar"` series in its hit-test loop, so the engine has no hover-tooltip support for radar at all - verified by reading engine.ts, not guessed. Nearest-category hover detection is a manual angle-from-center calculation on mousemove (not a browser hit-test); the mount 'grow from center' animation is approximated via a CSS scale(0)-&gt;scale(1) transform (motion() patch) with transformOrigin: "center", which resolves against the SVG's own viewBox (not the polygon's bounding box) per the CSS Transforms spec's view-box default for SVG content - a true per-vertex path-growth animation isn't available through WAAPI for polygon points. Centered card header (title+description) required a small family-local radarCardShell since the shared cross-family chartCardShell is left-aligned only.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/radar)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-radar-default.ts [chartRadarDefault]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
