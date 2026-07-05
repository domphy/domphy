---
title: "@domphy/blocks — scales"
description: "Implemented as a tileable SVG <pattern> (diagonal reuses this package's stripedPattern three-line-per-tile seam trick; horizontal/vertical use one edge-pinned..."
---

# scales

<script setup lang="ts">
import ScalesDemo from "../demos/blocks/scales.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `scales()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ScalesDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `direction` | `ScalesDirection` | Line orientation. Defaults to `"diagonal"`. |
| `spacing` | `number` | Pixel spacing between lines (tile size — controls density). Defaults to `10`. |
| `thickness` | `number` | Line stroke width, in px. Defaults to `1`. |
| `color` | `ThemeColor` | Theme color family for the lines. Defaults to `"neutral"`. |
| `lineTone` | `string` | Tone step for the line color (kept low/edge by default so it reads as subtle texture, not a loud pattern). Defaults to `"shift-3"`. |
| `children` | `DomphyElement \| DomphyElement[]` | Content composited above the pattern — the "container" variant. Defaults to a small demo panel. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
Implemented as a tileable SVG &lt;pattern&gt; (diagonal reuses this package's stripedPattern three-line-per-tile seam trick; horizontal/vertical use one edge-pinned line per tile) rather than a repeating-linear-gradient background-image — the spec's own researchNote explicitly allows either technique as equally valid. Only one exportName was specified in the task, so the single `scales()` factory doubles as the reference's separate 'container' wrapper variant: any `children` passed in render above the pattern via a position:relative content slot, matching the documented composited-content behavior without a second export.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/scales)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/scales.ts [scales]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
