---
title: "@domphy/blocks — numberTicker"
description: "IntersectionObserver-gated, one-shot-by-default scroll trigger (fails open to immediate play when IntersectionObserver is unavailable, e.g."
---

# numberTicker

<script setup lang="ts">
import NumberTickerDemo from "../demos/blocks/numberTicker.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `numberTicker()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="NumberTickerDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `value` | `number` | Target number the count animates to (or from, when `direction` is `"down"`). Defaults to `100`. |
| `startValue` | `number` | The other end of the count — animated from when `direction` is `"up"`, animated to when `"down"`. Defaults to `0`. |
| `direction` | `"up" \| "down"` | `"up"` (default) counts from `startValue` to `value`; `"down"` counts from `value` to `startValue`. |
| `delay` | `number` | Seconds to wait, once visible, before the count starts. Defaults to `0`. |
| `decimalPlaces` | `number` | Decimal places to display. Defaults to `0`. |
| `locale` | `string` | `Intl.NumberFormat` locale, controlling thousands separators/decimal marks. Defaults to `"en-US"`. |
| `once` | `boolean` | Plays once the first time the element scrolls into view, then never replays. Defaults to `true`. |
| `color` | `ThemeColor` | Theme color family for the digits. Defaults to `"neutral"`. |
| `spring` | `NumberTickerSpring` | Spring tuning. See . |
| `style` | `StyleObject` | — |

::: details Implementation notes
IntersectionObserver-gated, one-shot-by-default scroll trigger (fails open to immediate play when IntersectionObserver is unavailable, e.g. non-browser test runtimes), optional `delay`, and a hand-rolled 1D spring-damper integrator (mass/stiffness/damping, tuned near-critically-damped so it decelerates into the target without overshoot) driving `requestAnimationFrame`-timed `textContent` writes — matches the 'fast start, gentle settle, no linear ticking' spec requirement. Digits are formatted via `Intl.NumberFormat` (locale + decimalPlaces, thousands separators included). Domphy has no bundled spring/physics library (same documented gap as this package's existing `smoothCursor` component), so the integrator is hand-written rather than pulled from a dependency — this is a faithful physical approximation, not a stub. Per-frame DOM writes are imperative (not through Domphy's reactive `State.set()`) to avoid per-frame render overhead, consistent with this package's existing guidance for continuous/high-frequency effects.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/number-ticker)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/numberTicker.ts [numberTicker]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
