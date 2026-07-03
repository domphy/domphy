---
title: "@domphy/blocks — confettiButton"
description: "The spec's 'ready-made button variant that triggers the burst on click,' implemented in the same file as `confetti()` since it is a small, closely related..."
---

# confettiButton

<script setup lang="ts">
import ConfettiButtonDemo from "../demos/blocks/confettiButton.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `confettiButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ConfettiButtonDemo" />

::: details Implementation notes
The spec's "ready-made button variant that triggers the burst on click," implemented in the same file as `confetti()` since it is a small, closely related second export sharing the same fire-options defaults and `createConfettiHandle` helper. Fires from the button's own screen position (origin computed from `getBoundingClientRect()` at click time). Its overlay `&lt;canvas&gt;` (fixed, full-viewport, pointer-events:none) is nested INSIDE the returned `&lt;button&gt;` rather than as a sibling, so the whole component stays a single complete `DomphyElement` root tree — valid HTML (canvas is flow content, not interactive content, so it's permitted inside a button) and the fixed positioning takes it out of the button's layout/click box entirely.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/confetti)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/confetti.ts [confettiButton]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
