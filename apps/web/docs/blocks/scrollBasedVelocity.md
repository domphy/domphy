---
title: "@domphy/blocks — scrollBasedVelocity"
description: "Full behavior implemented: rows of duplicated content in an overflow-hidden track, a shared rAF loop that accumulates position (wrapped modulo the measured..."
---

# scrollBasedVelocity

<script setup lang="ts">
import ScrollBasedVelocityDemo from "../demos/blocks/scrollBasedVelocity.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `scrollBasedVelocity()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ScrollBasedVelocityDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `rows` | `ScrollVelocityRow[]` | Explicit row list. Overrides `rowCount` when provided. |
| `rowCount` | `number` | Number of default demo rows to render when `rows` is omitted. Defaults to 2. |
| `baseVelocity` | `number` | Base scroll speed. Roughly "percent of one content copy's width per second". Defaults to 5. |
| `scrollReactive` | `boolean` | Multiplies/decays with page scroll speed to accelerate, skew, and (transiently) reverse rows. Defaults to true. |
| `repeat` | `number` | How many times each row's content is duplicated inside its track. Minimum 3. Defaults to 6. |
| `gap` | `number` | Gap between repeated copies, in `themeSpacing` units. Defaults to 8. |
| `rowGap` | `number` | Gap between rows, in `themeSpacing` units. Defaults to 6. |
| `fadeWidth` | `number` | Edge fade width, in `themeSpacing` units. Defaults to 24. |
| `fadeColor` | `ThemeColor` | Theme color the edge fades blend into. Defaults to "neutral". |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Full behavior implemented: rows of duplicated content in an overflow-hidden track, a shared rAF loop that accumulates position (wrapped modulo the measured per-copy track width for a seamless loop), a scroll-velocity term (EMA of window.scrollY delta) that both accelerates the base speed and can transiently overpower/reverse it, a matching skewX proportional to that velocity, edge gradient fades, per-row direction, pause via IntersectionObserver (off-screen) + visibilitychange (tab hidden), and an early-return under prefers-reduced-motion. The exact tuning constants (px/s per baseVelocity unit, velocity-to-skew multiplier, decay factor) are an original approximation — the spec gives no formula, only a qualitative description, and no upstream source was viewed. jsdom has no rAF/ResizeObserver/IntersectionObserver, so the motion loop's own guards make it a no-op in tests; only structure is exercised there.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/scroll-based-velocity)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/scrollBasedVelocity.ts [scrollBasedVelocity]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
