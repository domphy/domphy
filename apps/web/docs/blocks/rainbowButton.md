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

::: details Implementation notes
Full behavioral/visual port from the spec. Structure matches the given domSketch exactly: a relatively-positioned outer div wrapping a blurred glow layer (behind, in DOM order) plus the button itself, rather than a negative-z-index trick nested inside the button. Gradient stops are ThemeColor roles (error/secondary/primary/info/success) approximating the spec's five literal hues (red/violet/blue/cyan/yellow-green) — Domphy forbids raw hex/rgb on style props and has no dedicated violet family, so 'secondary' (this theme's rose/magenta) substitutes for violet, the same substitution already documented in this package's animatedGradientText.ts. Pan animation is a pure CSS background-position keyframe over a 200% background-size (seamless loop), fully ambient from mount. 'outline' variant uses the classic dual-background-layer gradient-border trick (opaque padding-box layer over an animated border-box gradient layer). Pill shape via an oversized border-radius (999px, clamped by the browser to the box's own geometry) rather than a themeSpacing token, since border-radius isn't a density-scaled control dimension. Hand-rolls its own button chrome (density-aware padding/radius formula reproduced by hand) instead of composing the ui button() patch, because that patch's own backgroundColor/outline (keyed off a single color prop) would conflict with the multi-stop animated fill/ring — the same tradeoff this package's borderBeam.ts/shineBorder.ts already document for their own bespoke container chrome. Verified doctor-clean (0 findings) via the domphy-doctor CLI, including its Layer-4 generated-CSS lint.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/rainbow-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/buttons/rainbowButton.ts [rainbowButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
