---
title: "@domphy/blocks — hyperText"
description: "Per-character spans with two interval timers (fast scramble reassignment + slower left-to-right lock), hover-trigger-by-default with optional view-trigger,..."
---

# hyperText

<script setup lang="ts">
import HyperTextDemo from "../demos/blocks/hyperText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `hyperText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="HyperTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Text content to animate. Defaults to a short demo phrase. |
| `tag` | `string` | HTML tag the container renders as. Defaults to `"div"`. |
| `duration` | `number` | Total milliseconds for the full scramble-to-resolve animation. Defaults to `800`. |
| `delay` | `number` | Milliseconds to wait after the auto/view trigger fires before the scramble starts. Defaults to `0`. |
| `hoverTrigger` | `boolean` | Replays the scramble on every mouse hover. Defaults to `true`. |
| `viewTrigger` | `boolean` | Plays the scramble once on scroll-into-view instead of automatically on mount. Defaults to `false`. |
| `characters` | `string` | Character pool randomly sampled while a character position is unresolved. Defaults to A-Z. |
| `style` | `StyleObject` | Passthrough style merged onto the container. |

::: details Implementation notes
Per-character spans with two interval timers (fast scramble reassignment + slower left-to-right lock), hover-trigger-by-default with optional view-trigger, configurable duration/delay/character pool/tag, spaces preserved as non-animated gaps. Matches the spec's 'interval/frame-driven character substitution, not CSS keyframes' requirement. Character DOM refs are written to directly inside the loop (not via reactive State) since this is a continuous high-frequency effect, matching this package's numberTicker/dock convention. Direct-source-diff fix (2026-07-05): Missing upstream's monospace font — proportional-font glyph width reflows/jitters neighboring characters as random glyphs swap mid-scramble. Added fontFamily:monospace.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/hyper-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/hyperText.ts [hyperText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
