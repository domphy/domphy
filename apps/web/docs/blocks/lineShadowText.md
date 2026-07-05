---
title: "@domphy/blocks — lineShadowText"
description: "Diagonally-striped, continuously-crawling shadow duplicate offset ~0.04em down-right behind the real text, stripe tile ~0.06em, 15s linear infinite crawl --..."
---

# lineShadowText

<script setup lang="ts">
import LineShadowTextDemo from "../demos/blocks/lineShadowText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `lineShadowText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LineShadowTextDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | Text content. Defaults to `"Line Shadow"`. |
| `shadowColor` | `ThemeColor` | Theme color family for the striped shadow layer. Defaults to `"neutral"` at a fixed high-contrast shift, which flips light/dark automatically with the theme. |
| `as` | `LineShadowTextTag` | Wrapping element tag. Defaults to `"span"`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Diagonally-striped, continuously-crawling shadow duplicate offset ~0.04em down-right behind the real text, stripe tile ~0.06em, 15s linear infinite crawl -- matches the spec's researchNote values. Implemented via a `::after` pseudo-element whose `content` reads `attr(data-shadow-text)` off the host (rather than a second literal DOM text node holding the duplicated string) so the string is never duplicated in markup and is not double-announced to screen readers (generated pseudo-element content is not exposed to the accessibility tree in current browsers) -- a stronger reading of the spec's own 'decorative duplicate...clipped to the glyph shapes' DOM sketch. The shadow's 'automatically flips to white in dark mode' behavior is achieved for free via a fixed-shift theme tone (`themeColor(l, 'shift-17', shadowColor)`) instead of a `prefers-color-scheme` branch, since Domphy tone shifts already resolve relative to the active theme surface rather than an absolute lightness value. Direct-source-diff fix (2026-07-05): The shadow-stripe pattern used a 50%-duty-cycle band (thick bars) — upstream colors only ~10% of each tile (fine lines). Corrected the gradient band width.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/line-shadow-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/lineShadowText.ts [lineShadowText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
