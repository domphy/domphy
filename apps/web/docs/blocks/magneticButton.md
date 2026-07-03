---
title: "@domphy/blocks — magneticButton"
description: "Full spring-physics pointer-follow wrapper: pointermove/pointerleave on the wrapper drive a mass/stiffness/damping simulation stepped every..."
---

# magneticButton

<script setup lang="ts">
import MagneticButtonDemo from "../demos/blocks/magneticButton.ts?raw"
</script>

A **Buttons** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `magneticButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="MagneticButtonDemo" />

::: details Implementation notes
Full spring-physics pointer-follow wrapper: pointermove/pointerleave on the wrapper drive a mass/stiffness/damping simulation stepped every requestAnimationFrame, clamped to maxDistance, applied as translate() on the single wrapped child, torn down in _onMount's Remove hook. Default demo child (approximating the reference's solid-blue pill CTA) uses a dark-blue dataTone edge anchor (shift-15, primary family) rather than a literal bright hex blue, and strong()'s fixed shift-11 text-color offset yields a light-blue bold label rather than pure white -- both are deliberate substitutions to stay within Domphy's theme-token/doctor-clean idiom (no raw hex/rgb colors allowed), matching the tradeoff already established by shimmerButton.ts/rainbowButton.ts elsewhere in this package. Verified: tsc clean, `domphy-doctor` reports 0 diagnostics, all tests pass.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/magnetic-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/buttons/magneticButton.ts [magneticButton]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
