---
title: "@domphy/blocks — interactiveHoverButton"
description: "Full visual/behavior implemented as pure CSS, no JS timers or pointer handlers: a pill button containing an accent dot span, a resting label span, and a hidden..."
---

# interactiveHoverButton

<script setup lang="ts">
import InteractiveHoverButtonDemo from "../demos/blocks/interactiveHoverButton.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `interactiveHoverButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="InteractiveHoverButtonDemo" />

::: details Implementation notes
Full visual/behavior implemented as pure CSS, no JS timers or pointer handlers: a pill button containing an accent dot span, a resting label span, and a hidden overlay span (duplicate label + inline-SVG right-arrow glyph), all driven by nested '&:hover:not([disabled]) [data-*]' selectors on the button's own style object (the same nested-selector technique glareHover.ts already uses). On hover the dot scale-transforms up 90x (a scale-based flood reveal, matching the research note's '~100x' description) while the resting label fades/slides out and the overlay fades/slides in, all sharing a 320ms cubic-bezier(0.22,1,0.36,1) transition. Overlay text uses the theme's lightest edge tone (shift-0) for contrast against the flooded accent, the same 'light text on saturated fill' convention rainbowButton.ts uses. Doctor-clean after adding a tone-background-inherit exemption on the decorative flood dot (same exemption meteors.ts's dot span carries, since a flood accent is intentionally a fixed tone, not a surface tracking ambient dataTone); 2 vitest assertions cover the default demo DOM shape and a custom label + onClick forwarding.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/interactive-hover-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/interactiveHoverButton.ts [interactiveHoverButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
