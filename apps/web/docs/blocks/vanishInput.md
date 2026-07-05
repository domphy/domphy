---
title: "@domphy/blocks — vanishInput"
description: "Full functional port: pill-shaped bordered field (dataTone edge-anchored surface, theme-driven so dark/light are both handled automatically rather than the..."
---

# vanishInput

<script setup lang="ts">
import VanishInputDemo from "../demos/blocks/vanishInput.ts?raw"
</script>

A **Inputs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `vanishInput()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="VanishInputDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `placeholders` | `string[]` | Phrases cycled through as the animated placeholder. Defaults to a short demo list. |
| `value` | `string` | Initial/controlled field value. Defaults to `""`. |
| `onChange` | `(value: string) =&gt; void` | Fires with the live input value on every keystroke. |
| `onSubmit` | `(value: string) =&gt; void` | Fires with the value present at the moment the vanish animation begins. |
| `id` | `string` | `id` attribute of the underlying `&lt;input&gt;`. Defaults to a generated unique id. |
| `name` | `string` | `name` attribute of the underlying `&lt;input&gt;`. |
| `rotationInterval` | `number` | Milliseconds each placeholder phrase is held before rotating to the next. Defaults to `3000`. |
| `className` | `string` | Extra class name merged onto the outer wrapper's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the outer wrapper. |

::: details Implementation notes
Full functional port: pill-shaped bordered field (dataTone edge-anchored surface, theme-driven so dark/light are both handled automatically rather than the spec's own hardcoded neutral-900/white guess), placeholder rotation via a single-item reactive keyed list crossfading with motion() (pauses + hides once the field has content, resumes once cleared), and the vanish/dissolve on submit/Enter: text is rasterized onto a hidden canvas using the real input's own resolved font metrics, sampled at a 2px stride into particles with rightward/downward-biased drift + independent fade rates, animated via requestAnimationFrame, then the field clears and onSubmit fires with the value present at the moment vanish began. Submit button reuses the shared @domphy/ui fab() patch (reactive neutral/primary color swap) instead of a hand-rolled fixed-shift backgroundColor, per the doctor's tone-background-inherit rule. Gap: environments with no real 2D canvas backend (verified in this repo's own jsdom test setup, and any legacy browser without canvas support) fall back to clearing the field immediately with no particle animation, a graceful degradation, not a missing feature, since canvas 2D is universal in real target browsers. Exact pixel colors/border tokens were flagged medium-confidence in the spec (no live demo could be inspected); resolved via this project's own theme token system instead of literal hex, which is the stronger, dark/light-correct choice anyway.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/placeholders-and-vanish-input)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/inputs/vanishInput.ts [vanishInput]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
