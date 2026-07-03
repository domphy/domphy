---
title: "@domphy/blocks — coolMode"
description: "Thin span wrapper attaches pointerdown/pointerup/pointerleave listeners only; particle DOM nodes are appended to one shared, module-singleton, fixed..."
---

# coolMode

<script setup lang="ts">
import CoolModeDemo from "../demos/blocks/coolMode.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `coolMode()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CoolModeDemo" />

::: details Implementation notes
Thin span wrapper attaches pointerdown/pointerup/pointerleave listeners only; particle DOM nodes are appended to one shared, module-singleton, fixed full-viewport pointer-events:none overlay on document.body (not nested in the wrapper), matching the spec's DOM sketch exactly. Hand-rolled rAF loop applies decaying-velocity/gravity physics and writes transform imperatively per particle per frame (per spec: 'not CSS keyframes'). Spawns every 30ms while held, tracks live pointer position via a window-level pointermove listener during the hold (not a stale pointerdown coordinate), stops on release/leave, caps at 45 concurrent particles, and tears the shared overlay + rAF loop down once no instance is mounted and no particle remains. Default appearance cycles through theme color families via themeColorToken (a concrete resolved hex, since imperative DOM paint can't hold a live var() reference) instead of a literal random-hue string, keeping the 'multicolored burst' fully theme-token-driven; image/text/emoji glyph appearances are also supported via a discriminated-union prop.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/cool-mode)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/coolMode.ts [coolMode]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
