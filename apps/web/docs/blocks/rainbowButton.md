---
title: "@domphy/blocks — rainbowButton"
description: "Full behavioral/visual port from the spec."
---

# rainbowButton

<script setup lang="ts">
import RainbowButtonDemo from "../demos/blocks/rainbowButton.ts?raw"
</script>

A **Buttons** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `rainbowButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="RainbowButtonDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement \| DomphyElement[] \| string` | Button label content. Defaults to `"Get unlimited access"`. |
| `variant` | `RainbowButtonVariant` | `"default"` is a solid dark (light-theme) / light (dark-theme) face with the animated rainbow showing only as a thin fading strip along the bottom border; `"outline"` is the literal inverse face with a visible border on 3 sides and the same bottom-only rainbow strip. Neither variant fills the whole face with the gradient. Defaults to `"default"`. |
| `size` | `RainbowButtonSize` | Standard button size preset. Defaults to `"default"`. |
| `colors` | `ThemeColor[]` | Gradient stops the sweep pans through, in order. Defaults to a five-hue rainbow approximation: `["error", "secondary", "primary", "info", "success"]`. |
| `duration` | `number` | One full pan cycle, in seconds. Defaults to `3`. |
| `onClick` | `(event: MouseEvent) =&gt; void` | — |
| `disabled` | `boolean` | — |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full behavioral/visual port from the spec. Structure matches the given domSketch exactly: a relatively-positioned outer div wrapping a blurred glow layer (behind, in DOM order) plus the button itself, rather than a negative-z-index trick nested inside the button. Gradient stops are ThemeColor roles (error/secondary/primary/info/success) approximating the spec's five literal hues (red/violet/blue/cyan/yellow-green) — Domphy forbids raw hex/rgb on style props and has no dedicated violet family, so 'secondary' (this theme's rose/magenta) substitutes for violet, the same substitution already documented in this package's animatedGradientText.ts. Pan animation is a pure CSS background-position keyframe over a 200% background-size (seamless loop), fully ambient from mount. 'outline' variant uses the classic dual-background-layer gradient-border trick (opaque padding-box layer over an animated border-box gradient layer). Pill shape via an oversized border-radius (999px, clamped by the browser to the box's own geometry) rather than a themeSpacing token, since border-radius isn't a density-scaled control dimension. Hand-rolls its own button chrome (density-aware padding/radius formula reproduced by hand) instead of composing the ui button() patch, because that patch's own backgroundColor/outline (keyed off a single color prop) would conflict with the multi-stop animated fill/ring — the same tradeoff this package's borderBeam.ts/shineBorder.ts already document for their own bespoke container chrome. Verified doctor-clean (0 findings) via the domphy-doctor CLI, including its Layer-4 generated-CSS lint. Direct-source-diff fix (2026-07-05): Filled the entire button face with the animated rainbow gradient — upstream's real technique (registry/magicui/rainbow-button.tsx) is a solid, theme-flipping flat face with the rainbow showing only as a thin fading strip along the BOTTOM border (via a 3-layer background-clip trick), plus a small blurred rainbow bar centered just under the button, not a symmetric halo. Rewrote to match both variants.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/rainbow-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/buttons/rainbowButton.ts [rainbowButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
