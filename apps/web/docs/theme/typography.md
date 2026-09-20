---
title: "Typography"
description: "Type scale via themeSize, pairing with patches, and font stacks (not theme CSS variables)."
---

# Typography

Text size in Domphy is an 8-step scale (`--fontSize-0` … `--fontSize-7`) resolved by `themeSize()`. The default with no `dataSize` ancestor is **index 2** (`1rem`).

| Index | Token | At 16px root | Typical use |
|------|---------|--------------|-------------|
| 0 | `0.75rem` | 12px | Captions, badges |
| 1 | `0.875rem` | 14px | Helper text |
| **2** | **`1rem`** | **16px** | **Body (default `themeSize(l, "inherit")`)** |
| 3 | `1.25rem` | 20px | Lead / small heading |
| 4 | `1.5625rem` | 25px | Section heading |
| 5 | `1.9375rem` | 31px | H2 |
| 6 | `2.4375rem` | 39px | Display |
| 7 | `3.0625rem` | 49px | Page title |

`themeSize(listener, size?)` takes `ElementSize`: `"inherit"` | `"increase-N"` | `"decrease-N"` with N ≤ 7 — not a numeric step.

```ts
import { themeSize } from "@domphy/theme"
import { heading, paragraph, small } from "@domphy/ui"

{ h2: "Title", $: [heading()] }
{ p: "Body copy.", $: [paragraph()] }
{ small: "Posted 3 days ago", $: [small()] }

// Optional: skip the heading tag bump
{ h2: "Same size as body", $: [heading({ size: "inherit" })] }
```

Do not set `fontSize` / `fontWeight` / `lineHeight` / `letterSpacing` / `fontFamily` / `color` in `style:` — doctor `inline-typography`. Use the patches above (and `strong()`, `emphasis()`, `code()`, `link()`).

## Font stack

`@domphy/theme` does **not** emit `--font-sans` / `--font-mono`, and `themeApply` does **not** take a font-options bag. `themeApply(el?: HTMLStyleElement)` writes `themeCSS()` into a `<style>` tag (or creates one). Passing `document.documentElement` would replace the page text with CSS.

Set fonts on `:root` yourself. On a press site the hooks are `--dp-font-sans` / `--dp-font-mono` / `--dp-font-display`:

```ts
// press.config.ts head, or any app <style>
`<style>:root{--dp-font-sans:"Inter",system-ui,sans-serif;--dp-font-mono:"JetBrains Mono",ui-monospace,monospace}</style>`
```

Preload with `<link rel="preconnect">` + a stylesheet, or `@font-face` with `font-display: swap`.

## Fluid size

For display type that should grow with the viewport, use CSS `clamp()` in a stylesheet — not inline on an element (that is still `inline-typography`). Patches own control-sized text.

## Color

Body text: `themeColor(l, "text")`. Captions and other non-essential copy: `themeColor(l, "muted")`. `"base"` is the family's brand step (`baseTones[role]`), not a muted/text role.

```ts
import { small } from "@domphy/ui"

{ small: "Secondary info", $: [small()] }           // patch sets color
{ small: "Error", $: [small({ color: "error" })] }
```

See [Tone](/docs/theme/tone) for the contrast contract.
