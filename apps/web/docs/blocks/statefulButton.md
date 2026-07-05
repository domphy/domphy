---
title: "@domphy/blocks — statefulButton"
description: "Full idle -> loading -> success -> idle state machine: a keyed single-item content array (_key = phase name) reconciles each transition as an unmount/mount..."
---

# statefulButton

<script setup lang="ts">
import StatefulButtonDemo from "../demos/blocks/statefulButton.ts?raw"
</script>

A **Buttons** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `statefulButton()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="StatefulButtonDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string \| DomphyElement \| DomphyElement[]` | Idle label content. Defaults to `"Send message"`. |
| `onClick` | `(event: MouseEvent) =&gt; void \| Promise&lt;unknown&gt;` | Click handler; may return a `Promise` — its resolve timing drives the loading-to-success transition. |
| `className` | `string` | — |
| `disabled` | `boolean` | — |
| `type` | `"button" \| "submit" \| "reset"` | — |
| `successHoldDuration` | `number` | How long the success checkmark holds before reverting to idle, in ms. Defaults to `2000`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full idle -&gt; loading -&gt; success -&gt; idle state machine: a keyed single-item content array (_key = phase name) reconciles each transition as an unmount/mount pair, giving each phase its own motion() enter (slide-up+fade-in) and exit (slide-down+fade-out); the spinner is @domphy/ui's spinner() patch, success is an inline checkmark glyph, idle label is bold via strong(). Button visually narrows via a reactive paddingInline (CSS-transitioned) while non-idle. successHoldDuration is exposed as an optional prop (default 2000ms) since the spec notes upstream exposes no such prop but implies a fixed ~2s hold -- this is a reasonable, backward-compatible enhancement (unset behavior matches spec). Verified: tsc clean, doctor 0 diagnostics, all tests pass including a fake-timer-driven full state-cycle test.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/stateful-button)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/buttons/statefulButton.ts [statefulButton]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
