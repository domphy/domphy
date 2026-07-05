---
title: "@domphy/blocks — animatedTestimonials"
description: "Two-column layout: an always-mounted photo stack (front photo full, 2 neighbors peeking with alternating-sign tilt/offset/scale, rest hidden) and a crossfading..."
---

# animatedTestimonials

<script setup lang="ts">
import AnimatedTestimonialsDemo from "../demos/blocks/animatedTestimonials.ts?raw"
</script>

A **Overlays** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedTestimonials()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedTestimonialsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `testimonials` | `AnimatedTestimonialItem[]` | Testimonial items. Defaults to 3 generic demo testimonials. |
| `autoplay` | `boolean` | Auto-advances on an interval. Defaults to `false`. |
| `intervalMs` | `number` | Milliseconds between automatic advances, when `autoplay` is on. Defaults to `5000`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Two-column layout: an always-mounted photo stack (front photo full, 2 neighbors peeking with alternating-sign tilt/offset/scale, rest hidden) and a crossfading quote/name/role block, both driven by pure reactive per-distance style functions (no motion() unmount needed). Optional autoplay (off by default) plus manual prev/next. Exact rotation degrees/z-index scheme are invented per the spec's own 'not from upstream, treat as design choice' allowance.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/animated-testimonials)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/overlays/animatedTestimonials.ts [animatedTestimonials]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
