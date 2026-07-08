---
title: "@domphy/blocks — sparklesText"
description: "Full behavior implemented: plain inherited-style text plus a reactive sparkle list seeded on mount and refreshed on an interval (spawnInterval = cycleDuration..."
---

# sparklesText

<script setup lang="ts">
import SparklesTextDemo from "../demos/blocks/sparklesText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sparklesText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SparklesTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Text content. Defaults to a short demo phrase. |
| `sparkleCount` | `number` | Roughly how many sparkles are alive at once. Defaults to 10. |
| `colors` | `[ThemeColor, ThemeColor]` | The two accent colors sparkles alternate between. Defaults to `["secondary", "primary"]`. |
| `minSize` | `number` | Smallest sparkle size, in `themeSpacing` units. Defaults to 1.5. |
| `maxSize` | `number` | Largest sparkle size, in `themeSpacing` units. Defaults to 3. |
| `cycleDuration` | `number` | Milliseconds for one sparkle's full grow/hold/shrink cycle. Defaults to 900. |
| `style` | `StyleObject` | Passthrough style merged onto the root element. |

::: details Implementation notes
Full behavior implemented: plain inherited-style text plus a reactive sparkle list seeded on mount and refreshed on an interval (spawnInterval = cycleDuration / sparkleCount), each sparkle a 4-point star SVG positioned at a random top/left percent with its own CSS keyframe animation (scale 0-&gt;1 + quarter rotate, hold, scale back to 0, opacity in/out) and self-cleanup via a matched setTimeout so the DOM population stays roughly constant. The upstream demo's two literal hex accent colors (#A07CFE violet, #FE8FB5 pink) cannot be used verbatim (Domphy forbids raw color literals) — mapped to the closest built-in theme families, `secondary` (rose/pink) and `primary` (blue, no violet family exists in the default theme), both overridable via the `colors` prop.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/sparkles-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/sparklesText.ts [sparklesText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
