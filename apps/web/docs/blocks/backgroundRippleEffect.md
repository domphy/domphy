---
title: "@domphy/blocks — backgroundRippleEffect"
description: "Declarative grid of bordered <div> cells (rows*columns, default 8x27 @56px) matching the spec's own DOM sketch, not canvas."
---

# backgroundRippleEffect

<script setup lang="ts">
import BackgroundRippleEffectDemo from "../demos/blocks/backgroundRippleEffect.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backgroundRippleEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BackgroundRippleEffectDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `rows` | `number` | Number of grid rows. Defaults to `8`. |
| `columns` | `number` | Number of grid columns. Defaults to `27`. |
| `cellSize` | `number` | Side length of each square cell, in px. Defaults to `56`. |
| `borderColor` | `ThemeColor` | Theme color family for cell borders. Defaults to `"neutral"`. |
| `fillColor` | `ThemeColor` | Theme color family for the cell fill. Defaults to `"neutral"`. |
| `rippleDuration` | `number` | One ripple pulse's duration, in ms. Defaults to `200`. |
| `staggerMs` | `number` | Extra delay added per unit of grid-distance from the clicked cell, in ms. Defaults to `20`. |
| `interactive` | `boolean` | Enables/disables click interactivity. Defaults to `true`. |
| `onCellClick` | `(cell: BackgroundRippleCell) =&gt; void` | Fires with the clicked cell's row/column, in addition to the visual ripple. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the grid. Defaults to a small demo panel. |
| `style` | `StyleObject` | Passthrough style merged onto the outer grid container. |

::: details Implementation notes
Declarative grid of bordered &lt;div&gt; cells (rows*columns, default 8x27 @56px) matching the spec's own DOM sketch, not canvas. On click, per-cell grid-distance from the clicked cell is computed once in JS and written as a proportional `animation-delay` into each cell's `style.animation` (all cells sharing one `@keyframes` declared on the container), so the ripple's propagation is driven by the compositor, not a JS frame loop. Setting `animation: 'none'` + forcing a reflow before reapplying lets the same cell replay on a second click. Cell fill uses `color` (themed) + `background-color: currentColor` rather than a themed `backgroundColor` directly, since Domphy's doctor flags any non-'inherit' themed `backgroundColor` (tone-background-inherit) — this substitution keeps the fill independently theme-colorable while staying compliant.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-ripple-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/backgroundRippleEffect.ts [backgroundRippleEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
