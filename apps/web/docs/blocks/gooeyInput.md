---
title: "@domphy/blocks — gooeyInput"
description: "Full functional port of the classic SVG goo-filter recipe (feGaussianBlur -> feColorMatrix threshold -> feBlend, referenced via filter: url(#id)) applied only..."
---

# gooeyInput

<script setup lang="ts">
import GooeyInputDemo from "../demos/blocks/gooeyInput.ts?raw"
</script>

A **Inputs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `gooeyInput()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GooeyInputDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `placeholder` | `string` | Placeholder text shown once expanded. Defaults to `"Search…"`. |
| `value` | `string` | Initial/controlled text content. Defaults to `""`. |
| `collapsedWidth` | `number` | Collapsed pill/circle width, in px. Defaults to `115`. |
| `expandedWidth` | `number` | Expanded text-field width, in px. Defaults to `200`. |
| `offset` | `number` | Gap, in px, between the detached icon bubble and the expanded field once open. Defaults to `50`. |
| `blurStrength` | `number` | Gaussian blur `stdDeviation` driving the goo merge — higher reads gooier. Defaults to `5`. |
| `onValueChange` | `(value: string) =&gt; void` | Fires with the live text value as the user types. |
| `onOpenChange` | `(open: boolean) =&gt; void` | Fires whenever the expanded/collapsed state toggles. |
| `disabled` | `boolean` | Disables the trigger and field entirely. Defaults to `false`. |
| `className` | `string` | Extra class name merged onto the outer wrapper's native `class` attribute. |
| `iconClassName` | `string` | Extra class name merged onto the icon bubble button. |
| `boxClassName` | `string` | Extra class name merged onto the pill/field box. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
Full functional port of the classic SVG goo-filter recipe (feGaussianBlur -&gt; feColorMatrix threshold -&gt; feBlend, referenced via filter: url(#id)) applied only to the icon+pill 'chrome' group and only while a transition is in flight, per the spec's own performance guidance; icon bubble stays pinned while the pill box grows/moves via motion() driven by a shared State&lt;MotionKeyframe&gt; so width/left tween in lockstep, auto-focusing the field on open and closing on outside-click/Escape/re-click. Uses the spec's own documented sizing defaults (collapsed 115px, expanded 200px, offset 50px, blur strength 5). One source-level fix required to make this correct in real browsers: stdDeviation (and colorInterpolationFilters) are literal-camelCase SVG presentation attributes that were missing from packages/core/src/constants/CamelAttributes.ts, so they would have serialized to the DOM as the invalid std-deviation attribute; added additively (same class of gap this package's own squigglyText.ts had already found and fixed for feTurbulence's baseFrequency/numOctaves), and packages/core was rebuilt so the fix is live. No visual/behavioral gaps remain versus the spec.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/gooey-input)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/inputs/gooeyInput.ts [gooeyInput]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
