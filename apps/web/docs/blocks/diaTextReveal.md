---
title: "@domphy/blocks — diaTextReveal"
description: "Gradient sweep via background-clip:text over a plain solid base layer, IntersectionObserver view-trigger, setTimeout-sequenced duration/delay/pauseBetween,..."
---

# diaTextReveal

<script setup lang="ts">
import DiaTextRevealDemo from "../demos/blocks/diaTextReveal.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `diaTextReveal()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="DiaTextRevealDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string \| string[]` | Text to display, or a list of strings to cycle through (one sweep per item). Defaults to a demo phrase. |
| `colors` | `ThemeColor[]` | Gradient colors the sweeping band travels through, left to right. Defaults to five vivid theme roles. |
| `finalColor` | `ThemeColor` | Theme color the text rests at once the sweep has passed. Defaults to `"neutral"` (normal foreground text). |
| `duration` | `number` | Milliseconds the sweep itself takes to travel across the text. Defaults to `1500`. |
| `delay` | `number` | Milliseconds to wait (after the trigger fires) before the first sweep starts. Defaults to `0`. |
| `autoStart` | `boolean` | Starts the sweep automatically the first time the element scrolls into view. When `false`, the sweep instead waits for a click (there is no external imperative trigger in this factory-function API, so click is the manual-trigger substitute). Defaults to `true`. |
| `repeat` | `boolean` | When multiple `children` items are given, loop back to the first after the last instead of stopping there; when a single string is given, keep re-sweeping it on `duration + pauseBetween` cycles instead of sweeping only once. Defaults to `false`. |
| `pauseBetween` | `number` | Milliseconds paused (settled, solid color) between one item's sweep finishing and the next starting. Defaults to `500`. |
| `reserveWidth` | `boolean` | Reserves enough inline width for the longest item so cycling text doesn't shift surrounding layout. Defaults to `false`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
Gradient sweep via background-clip:text over a plain solid base layer, IntersectionObserver view-trigger, setTimeout-sequenced duration/delay/pauseBetween, list-cycling with optional infinite repeat, and reserveWidth (ch-based min-width) are all implemented per spec. Gap: the spec's 'requiring a manual trigger' (autoStart:false) implies an external imperative trigger API (e.g. a React ref/method), but this package's components are complete factory-function trees with no exposed imperative handle — substituted with a click-to-play interaction on the element itself as the closest reasonable equivalent, documented in the JSDoc and file header. Default colors use 5 theme ColorRole tokens (primary/secondary/info/success/warning) instead of raw hex, per Domphy's no-literal-color constraint.

Status: **partial** · Reference: [Magic UI original](https://magicui.design/docs/components/dia-text-reveal)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/diaTextReveal.ts [diaTextReveal]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
