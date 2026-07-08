---
title: "@domphy/blocks — particles"
description: "Fully functional canvas particle simulation (ambient drift + edge wrap + mouse-repulsion easing scaled by `ease`/`staticity`, devicePixelRatio-aware canvas..."
---

# particles

<script setup lang="ts">
import ParticlesDemo from "../demos/blocks/particles.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `particles()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ParticlesDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `quantity` | `number` | Number of particles. Defaults to `100`. |
| `color` | `ThemeColor` | Theme color family for the particles. Defaults to `"neutral"` (reads bright against a dark surface). |
| `size` | `number` | Base particle radius, in canvas pixels. Defaults to `0.4`. |
| `ease` | `number` | Higher = smoother/slower easing back to rest. Defaults to `50`. |
| `staticity` | `number` | Higher = more resistant to the mouse-repulsion force. Defaults to `50`. |
| `vx` | `number` | Ambient horizontal drift velocity. Defaults to `0`. |
| `vy` | `number` | Ambient vertical drift velocity. Defaults to `0`. |
| `refreshKey` | `ValueOrState&lt;unknown&gt;` | Toggle (any `ValueOrState` value change) to regenerate the particle set. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the particle field. Defaults to a small demo heading. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Fully functional canvas particle simulation (ambient drift + edge wrap + mouse-repulsion easing scaled by `ease`/`staticity`, devicePixelRatio-aware canvas sizing, ResizeObserver regeneration, `refreshKey: ValueOrState&lt;unknown&gt;` for external regeneration triggers). One noted gap: canvas 2D fill color is resolved ONCE at mount via `themeColorToken()` (a concrete hex string), not reactively via `themeColor()`'s `var(--…)` CSS reference, because canvas drawing calls are imperative JS with no concept of CSS custom properties — so the particle color will NOT automatically repaint if the page's theme is swapped at runtime after mount (a live-swap would need an explicit theme-change listener re-deriving the token and letting the next animation frame pick it up; out of scope for this decorative background primitive, and consistent with the spec's own note that upstream demos typically resolve theme-based color once at setup rather than reactively). Guards `canvas.getContext('2d') === null` (verified: jsdom without the optional `canvas` npm package returns `null`, not a throw) before starting the animation loop, so it degrades gracefully in non-canvas-capable/headless environments instead of crashing.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/particles)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/particles.ts [particles]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
