---
title: "@domphy/blocks — pulsatingButton"
description: "Ordinary button() patch plus a decorative, absolutely-positioned, pointer-events:none, aria-hidden glow span behind the label."
---

# pulsatingButton

<script setup lang="ts">
import PulsatingButtonDemo from "../demos/blocks/pulsatingButton.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `pulsatingButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="PulsatingButtonDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string \| DomphyElement \| DomphyElement[]` | Label content. Defaults to `"Pulsating Button"`. |
| `onClick` | `(event: MouseEvent) =&gt; void` | Click handler. |
| `disabled` | `boolean` | Disables the button (the glow keeps looping regardless). |
| `color` | `ValueOrState&lt;ThemeColor&gt;` | Button color family. Also the glow's color family unless `pulseColor` is set. Defaults to `"primary"`. |
| `pulseColor` | `ThemeColor` | Overrides the glow's own color family independent of the button's `color`. |
| `duration` | `number` | One full pulse/ripple cycle, in ms. Defaults to `1500`. |
| `expandDistance` | `number` | How far outward the glow/ring expands, in `themeSpacing` units (≈8px at the default). Defaults to `2`. |
| `variant` | `PulsatingButtonVariant` | `"pulse"` (symmetric breathing glow) or `"ripple"` (one-directional expanding-and-fading ring). Defaults to `"pulse"`. |
| `style` | `StyleObject` | Passthrough style merged onto the button. |

::: details Implementation notes
Ordinary button() patch plus a decorative, absolutely-positioned, pointer-events:none, aria-hidden glow span behind the label. The glow layer's own `color` is bound through the exact same reactive themeColor(l, tone, family) call driving the button's own background (family = pulseColor override, else the button's own color prop) — this is how the glow 'tracks the button's live color' with zero runtime color-observation/polling needed, a simpler and more idiomatic solution than the researchNote's own suggested resize/attribute-observer fallback. Since @keyframes step values must be static strings (no reactive functions), the looping animation only ever varies box-shadow's numeric spread and references the CSS `currentColor` keyword (with color-mix() for the fade) rather than baking a color into the keyframe — letting the loop stay theme-reactive. Both 'pulse' (symmetric 0%/50%/100% breathing) and 'ripple' (one-directional 0%-&gt;100% expand-and-fade snap-back) variants implemented. expandDistance is expressed in themeSpacing units (default 2 ~= 8px at the base font size, matching the spec's literal default) rather than a raw px prop.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/pulsating-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/pulsatingButton.ts [pulsatingButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
