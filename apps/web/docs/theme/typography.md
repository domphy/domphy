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

Do not write literal `fontSize` / `fontWeight` / `lineHeight` / `letterSpacing` / `fontFamily` / `color` values in `style:` — doctor `inline-typography`. Reach for the patches above (and `strong()`, `emphasis()`, `code()`, `link()`) first; where a patch has no say — a display headline's tracking, a numeric ticker's weight — use the tokens below, which are theme values, not literals.

## Font stack

The theme owns the document's font stack. `buildThemeCSS()` declares `font-family` on the themed root from the `"sans-serif"` entry, so a page that only calls `themeApply()` inherits it everywhere. Without it the document falls back to the UA default, which is a **serif** — measured `"Times New Roman"` in Chromium on a bare `themeApply()` page.

| Token | Name | Default |
|-------|------|---------|
| `--fontFamily-sans-serif` | `"sans-serif"` | `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, …` |
| `--fontFamily-monospace` | `"monospace"` | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, …` |

`themeFont(family?)` returns the `var(--fontFamily-…)` reference. Most elements need nothing — reach for it only to opt OUT of the inherited stack:

```ts
import { themeFont } from "@domphy/theme"

{ code: "npm i @domphy/theme", style: { fontFamily: themeFont("monospace") } }
```

Swap the stacks theme-wide with `setTheme` — no per-element edits, and it follows `[data-theme]` like every other token:

```ts
setTheme("light", {
  fontFamilies: {
    "sans-serif": '"Inter", system-ui, sans-serif',
    monospace: '"JetBrains Mono", ui-monospace, monospace',
  },
})
```

Preload with `<link rel="preconnect">` + a stylesheet, or `@font-face` with `font-display: swap`.

`themeApply` still does **not** take a font-options bag: `themeApply(el?: HTMLStyleElement)` writes `themeCSS()` into a `<style>` tag (or creates one). Passing `document.documentElement` would replace the page text with CSS.

## Weight

`themeWeight(weight?)` → `var(--fontWeight-…)`. Seven named steps, the CSS weight classes that carry a standard name:

| Name | Value | | Name | Value |
|------|-------|-|------|-------|
| `"light"` | `300` | | `"bold"` | `700` |
| `"regular"` *(default)* | `400` | | `"extrabold"` | `800` |
| `"medium"` | `500` | | `"black"` | `900` |
| `"semibold"` | `600` | | | |

```ts
import { themeWeight } from "@domphy/theme"

{ span: "24,051", style: { fontWeight: themeWeight("medium") } }
```

## Letter spacing

`themeLetterSpacing(spacing?)` → `var(--letterSpacing-…)`. Values are `em`-relative, so tracking scales with whatever `themeSize()` resolved on the element. Display type set at the top of the size scale generally wants `"tight"`; small all-caps labels want `"wide"` or `"wider"`.

| Name | Value |
|------|-------|
| `"tighter"` | `-0.05em` |
| `"tight"` | `-0.025em` |
| `"normal"` *(default)* | `normal` |
| `"wide"` | `0.025em` |
| `"wider"` | `0.05em` |
| `"widest"` | `0.1em` |

```ts
import { themeLetterSpacing } from "@domphy/theme"

{ h1: "Domphy", $: [heading()], style: { letterSpacing: themeLetterSpacing("tight") } }
```

Both accessors throw on a name the `"light"` theme does not register, listing the ones it does — register your own with `setTheme("light", { fontWeights: { … } })`.

### Press sites

A press site's `--dp-font-sans` / `--dp-font-mono` / `--dp-font-display` hooks still work and still win, since they are read by `body`/code rules rather than the themed root:

```ts
// press.config.ts head
`<style>:root{--dp-font-sans:"Inter",system-ui,sans-serif;--dp-font-mono:"JetBrains Mono",ui-monospace,monospace}</style>`
```

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
