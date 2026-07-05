---
title: "@domphy/blocks — ripple"
description: "Pure CSS: every ring plays the identical 'breathe' @keyframes (scale 0.92 -> 1 -> 0.92, ease, infinite), only `animation-delay` differs per ring (index *..."
---

# ripple

<script setup lang="ts">
import RippleDemo from "../demos/blocks/ripple.ts?raw"
</script>

A **Backgrounds** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `ripple()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="RippleDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `mainCircleSize` | `number` | Diameter of the innermost ring, in px. Defaults to `210`. |
| `mainCircleOpacity` | `number` | Opacity of the innermost ring. Each successive ring loses a further `0.03`. Defaults to `0.24`. |
| `numCircles` | `number` | How many concentric rings to render. Defaults to `8`. |
| `color` | `ThemeColor` | Theme color family for the ring borders/glow. Defaults to `"neutral"`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above/centered within the ripple. Defaults to a small demo heading. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Pure CSS: every ring plays the identical 'breathe' @keyframes (scale 0.92 -&gt; 1 -&gt; 0.92, ease, infinite), only `animation-delay` differs per ring (index * 0.06s), so the staggered starts alone produce the outward-ripple read with no ring ever actually growing past its own fixed diameter -- matches the spec's own description precisely ('faking a traveling ripple purely through staggered timing'). Ring size/opacity step per index (+70px / -0.03) and defaults (mainCircleSize 210, mainCircleOpacity 0.24, numCircles 8) match the spec's research note. The stack is `mask-image`-clipped (linear-gradient to transparent at the bottom) so it fades out toward the container's bottom edge. Rings intentionally disable the low-opacity doctor rule (they're ambient decoration, not interactive controls, which is exactly what that rule's own message text carves out an exception for) and the missing-color rule (no text of their own, aria-hidden).

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/ripple)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/backgrounds/ripple.ts [ripple]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
