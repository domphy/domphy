---
title: "@domphy/blocks — confetti"
description: "Ported using the already-approved `canvas-confetti` dependency (`confettiLib.create(canvas, opts)`), matching upstream's documented default fire options plus..."
---

# confetti

<script setup lang="ts">
import ConfettiDemo from "../demos/blocks/confetti.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `confetti()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ConfettiDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `options` | `ConfettiFireOptions` | Base options merged under every `fire()` call. See `canvas-confetti`'s `Options`. |
| `globalOptions` | `ConfettiGlobalOptions` | Options for the underlying `confetti.create(canvas, ...)` instance (mirrors upstream's `globalOptions` prop). Defaults to `{ resize: true, useWorker: true }`; `resize` is always forced on so the canvas tracks its element size. |
| `onReady` | `(handle: ConfettiHandle) =&gt; void` | Called once the canvas is mounted and the imperative handle is ready. |
| `autoFire` | `boolean` | Fires one burst automatically the moment the canvas mounts. Defaults to `true`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content rendered after the canvas (mirrors upstream's `{children}`). The burst is reachable from these children via the `onReady` handle — Domphy's equivalent of upstream's `ConfettiContext`, which has no runtime-context analog. |
| `style` | `StyleObject` | Passthrough style merged onto the canvas. |

::: details Implementation notes
Ported using the already-approved `canvas-confetti` dependency (`confettiLib.create(canvas, opts)`), matching upstream's documented default fire options plus the spec's square/circle/star shape mix. Returns a bare `&lt;canvas&gt;` (fixed, full-viewport, transparent, pointer-events:none, aria-hidden) and exposes an imperative `{ fire, reset }` handle via `onReady`, per the spec's "exposed imperative handle/ref" requirement. `autoFire` defaults to `true` (a burst fires ~150ms after mount) so the zero-arg call is a genuinely working demo out of the box; pass `autoFire: false` for a purely imperative canvas that stays inert until `onReady`'s handle fires it. Direct-source-diff fix (2026-07-05): The `autoFire` prop's JSDoc claimed it defaults to false, but the actual code (correctly) defaults it to true, matching upstream's auto-fire-on-mount behavior — corrected the misleading comment.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/confetti)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/confetti.ts [confetti]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
