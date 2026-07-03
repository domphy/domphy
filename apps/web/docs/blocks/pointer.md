---
title: "@domphy/blocks — pointer"
description: "Hover zone hides the native cursor (CSS cursor:none) and tracks the pointer with a custom visual."
---

# pointer

<script setup lang="ts">
import PointerDemo from "../demos/blocks/pointer.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `pointer()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="PointerDemo" />

::: details Implementation notes
Hover zone hides the native cursor (CSS cursor:none) and tracks the pointer with a custom visual. Position tracking is imperative (direct DOM mutation on mousemove/rAF), matching the spec's own guidance that a lerp-per-rAF is an acceptable substitute for Framer Motion's spring. Enter/leave fade+scale via CSS transition; the default glyph runs an independent CSS @keyframes scale/rotate loop layered on top of position tracking, demonstrating the spec's 'two independent animation concerns'. Default cursor visual is a two-tone ring (primary outline + surface-colored center) rather than any of the gallery's specific glyphs (heart/emoji/dot) — the spec explicitly states there is no single canonical default and treats the visual as a pure children slot, so any reasonable default is correct. One implementation subtlety worth flagging for reviewers: the `_onMount` hook is attached to the cursor element itself (not the outer container), because in Domphy's render order a parent's `_onMount` fires before its children are attached to the DOM — attaching to the container and querying for the cursor child inside its own `_onMount` would find nothing yet.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/pointer)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/pointer.ts [pointer]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
