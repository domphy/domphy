<script setup lang="ts">

import Basic from "../demos/palette/basic.ts?raw"
</script>

# Palette

The palette engine built into `@domphy/theme` is Domphy's color-palette quality toolkit: **measure and validate** sequential color ramps using five perceptual metrics in CIELAB, alongside the runtime theme tokens built on those ramps.

Framework-agnostic, zero dependencies, pure color science. (Ported from the *Chromametry* research project, same author.)

## Install

```bash
npm install @domphy/theme
```

## Live Example

Generate a WCAG-optimized 18-step ramp from any anchor color with `generateRamp`:

<CodeEditor :code="Basic" />

## Measure

`Ramp` / `Palette` score a palette against five metrics (all in CIELAB):

```ts
import { Ramp } from "@domphy/theme"

const ramp = new Ramp(blueHexes, "blue")
ramp.metrics       // { contrastEfficiency, lightnessLinearity, chromaSmoothness, hueStability, spacingUniformity }
ramp.score         // 0–100 (geometric mean of the normalized metrics)
ramp.wcag[45].span // how many steps clear WCAG 4.5:1
```

```ts
import { Palette } from "@domphy/theme"
const palette = new Palette({ blue, red, green })
palette.score // aggregate score across all ramps
```

## Generate

`generateRamp` builds a WCAG-optimized ramp from a base color, so you don't have to hand-pick steps to get a good score:

```ts
import { generateRamp } from "@domphy/theme"

const primary = generateRamp("#4a7ff4", 18)   // 18 hex strings, ready to use
```

See [**generateRamp**](./generator) for the full API and how it composes into `@domphy/theme`'s `generateTheme`.

## Why this matters

Most design systems hand-pick color steps; few can *prove* their palettes are perceptually even and accessible. The palette engine makes palette quality a measurable property — and `@domphy/theme`'s runtime tokens are built on top of it.

## Paper

[**Measuring palette quality**](./measuring) — the five metrics, how they're computed, and a benchmark of popular design systems.

[**DESIGN.md**](https://github.com/domphy/domphy/blob/main/DESIGN.md) — the full design-system reference: how `generateRamp`'s warp curve is derived, and how it ties into `@domphy/theme`'s context-aware tone/spacing/size model.
