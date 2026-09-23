# @domphy/theme

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/theme/) · [npm](https://www.npmjs.com/package/@domphy/theme)

Context-aware color, size, density, and spacing for Domphy.

It provides:

- `themeColor()` for colors
- `themeSize()` for font size
- `themeFont()` / `themeWeight()` / `themeLetterSpacing()` for the rest of typography
- `themeDensity()` for the current density factor
- `themeSpacing()` for final spacing values

`themeApply()` also puts the theme's sans stack on the themed root, so a page
that calls it inherits a real UI font instead of the UA's serif default.

## Install

```bash
npm install @domphy/theme
```

## Setup

Call `themeApply()` once on the client:

```ts
import { themeApply } from "@domphy/theme"

themeApply()
```

Then set `dataTheme` on a root element:

```ts
{ div: [App], dataTheme: "light" }
```

`light` and `dark` are built in.

## Quick Example

```ts
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme"

const button = {
  button: "Save",
  style: {
    fontSize: (listener) => themeSize(listener, "inherit"),
    paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
    paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
    borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
    backgroundColor: (listener) => themeColor(listener, "inherit", "primary"),
    color: (listener) => themeColor(listener, "shift-9", "primary"),
  },
}
```

## Tone Aliases

Prefer semantic aliases over raw `shift-N` indices — they read as intent and keep usage consistent across a codebase. Aliases are sugar over the existing `shift-N` machinery, so they stay context-aware (`dataTone`) and resolve correctly in both light and dark themes.

| Alias | Resolves to | Use for |
| --- | --- | --- |
| `surface` | `shift-1` | subtle raised background |
| `hover` | `shift-2` | hover/active background |
| `border` | `shift-3` | default hairline divider |
| `border-strong` | `shift-4` | control outline (button/input/card boundary) |
| `muted` | `shift-8` | secondary/disabled text |
| `text` | `shift-9` | default/primary text |

```ts
color: (listener) => themeColor(listener, "text", "primary")
// identical result to:
color: (listener) => themeColor(listener, "shift-9", "primary")
```

Aliases work everywhere a tone is accepted: `themeColor()`, `themeColorToken()`, and `dataTone`.

## Theme Registry

```ts
import { setTheme } from "@domphy/theme"

setTheme("brand", {
  colors: {
    primary: ["#ffffff", "#f7f5ff", "#efe8ff", "#e5d9ff", "#d6c2ff", "#c4a6ff", "#af87ff", "#9a6dff", "#8658ff", "#7345f7", "#6033df", "#512bc0", "#43249e", "#351c7d", "#28155d", "#1c0e3f", "#0e0720", "#000000"],
  },
  baseTones: {
    primary: 9,
  },
})
```

Custom color ramps should follow the current 18-step model.

## Brand Theme In One Call

`generateTheme()` builds every 18-step ramp from one hex per role, so you never hand-pick the intermediate steps:

```ts
import { generateTheme, setTheme, themeApply } from "@domphy/theme"

setTheme("light", generateTheme({ primary: "#ff6600", neutral: "#8d8d8d" }))
themeApply()
```

- Each ramp is sampled at the WCAG luminance ladder, so **every pair 9 steps apart clears AA 4.5:1 for any hue** — `themeColor(l, "text")` over a `shift-0` surface is a guarantee, not a statistic. ([how](https://domphy.com/docs/palette/generator))
- `setTheme("light", …)` re-derives the built-in `dark` theme, so the brand reaches dark mode too. Explicit `setTheme("dark", …)` overrides survive the rebuild.
- `themeCSS()` emits `color-scheme` per theme, so native scrollbars and form controls follow along.
- The `light` theme is emitted on `:root` as well as `[data-theme="light"]`, so a page that forgets the attribute renders the light theme instead of unstyled. `[data-theme="dark"]` still wins on `<html>`.

## Docs

- [Theme guide](https://domphy.com/docs/theme/)
- [Theme setup](https://domphy.com/docs/theme/setup)
- [Theme API](https://domphy.com/docs/theme/api)
