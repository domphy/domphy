---
title: "@domphy/blocks — rippleButton"
description: "Full behavioral port."
---

# rippleButton

<script setup lang="ts">
import RippleButtonDemo from "../demos/blocks/rippleButton.ts?raw"
</script>

A **Buttons** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `rippleButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="RippleButtonDemo" />

::: details Implementation notes
Full behavioral port. Composes the ui button() patch for standard chrome (spec: 'looks like an ordinary button at rest'), adding position:relative/overflow:hidden and a reactive ripple layer. Each click reads coordinates relative to the button's own bounding box (getBoundingClientRect, not the button's center), spawning a ripple sized to fully cover the button from any origin; ripples are tracked in a reactive keyed array (same pattern this package's animatedList.ts uses for its feed) so rapid repeated clicks produce multiple concurrently-animating ripples, each with a stable id used as its _key. Every ripple is auto-removed via a duration-matched setTimeout, with all pending timers cleared on unmount to avoid leaks. rippleColor is exposed as a ThemeColor role (default 'neutral', resolved near-white via a shift-0 edge tone) rather than the spec's literal RGB string, since Domphy forbids raw rgb()/hex on style props — matching the semi-transparent light/white default the spec itself calls out. Verified with jsdom tests covering click-position accuracy, auto-removal timing, and multi-ripple overlap, plus doctor-clean (0 findings) via the domphy-doctor CLI.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/ripple-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/buttons/rippleButton.ts [rippleButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
