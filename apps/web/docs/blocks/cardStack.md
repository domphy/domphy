---
title: "@domphy/blocks — cardStack"
description: "Full implementation: fixed DOM nodes (no list-reorder churn) each holding a depth state that an IntersectionObserver-gated setInterval advances every cycle,..."
---

# cardStack

<script setup lang="ts">
import CardStackDemo from "../demos/blocks/cardStack.ts?raw"
</script>

A **Cards** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `cardStack()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CardStackDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `CardStackItem[]` | Testimonial items, front-to-back initial order. Defaults to 4 demo testimonials. |
| `offsetPx` | `number` | Vertical stagger offset per depth level, in px. Defaults to `14`. |
| `scaleStep` | `number` | Scale-down factor applied per depth level (fraction subtracted from `1`). Defaults to `0.06`. |
| `intervalMs` | `number` | Milliseconds between automatic cycles. Defaults to `4000`. |
| `color` | `ThemeColor` | Card surface color family. Defaults to `"neutral"`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer stack container. |

::: details Implementation notes
Full implementation: fixed DOM nodes (no list-reorder churn) each holding a depth state that an IntersectionObserver-gated setInterval advances every cycle, tweened via @domphy/ui's motion() (Web Animations API) with a cubic-bezier(0.34,1.56,0.64,1) 'back-ease' curve approximating the spec's spring-style overshoot-on-settle — Domphy's motion() has no dedicated spring-physics integrator, only WAAPI easing curves, so this is the closest available approximation rather than a skipped feature. z-index snaps immediately per depth change (not tweened) so the departing front card visibly tucks under the deck as it slides back.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/card-stack)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/cards/cardStack.ts [cardStack]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
