---
title: "@domphy/blocks — smoothCursor"
description: "Global full-viewport cursor implemented as an rAF-driven spring-damper simulation (force = -stiffness*displacement - damping*velocity, divided by mass),..."
---

# smoothCursor

<script setup lang="ts">
import SmoothCursorDemo from "../demos/blocks/smoothCursor.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `smoothCursor()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SmoothCursorDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `DomphyElement` | Custom cursor graphic — replaces the default arrow glyph. |
| `spring` | `SmoothCursorSpring` | Spring tuning. See . |
| `color` | `ThemeColor` | Theme color for the default arrow glyph. Defaults to `"neutral"`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Global full-viewport cursor implemented as an rAF-driven spring-damper simulation (force = -stiffness*displacement - damping*velocity, divided by mass), matching the researchNote's suggested defaults (damping 45, stiffness 400, mass 1, restDelta 0.001) as starting tuning, exposed as overridable props. Rotation is derived from the delta between consecutive frame positions (atan2) and relaxes naturally as velocity settles. Native cursor is hidden globally via `document.body.style.cursor = 'none'` on mount and restored on `_onRemove`, with the previous value captured/restored (not hardcoded to empty string) to be a good citizen alongside other cursor-hiding code. Default glyph is an original hand-drawn arrow/pointer polygon (not copied from any OS or icon library asset) — spec states the exact default shape wasn't documented upstream and any simple arrow-cursor silhouette is acceptable. Direct-source-diff fix (2026-07-05): Two behaviors were missing versus upstream: the glyph wasn't centered on the pointer position (no -50%/-50% translate), and there was no movement-driven scale-squish. Added both.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/smooth-cursor)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/smoothCursor.ts [smoothCursor]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
