# @domphy/theme

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/theme/) · [npm](https://www.npmjs.com/package/@domphy/theme)

Context-aware color, size, density, and spacing for Domphy.

It provides:

- `themeColor()` for colors
- `themeSize()` for font size
- `themeDensity()` for the current density factor
- `themeSpacing()` for final spacing values

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
    borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
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

## Docs

- [Theme guide](https://domphy.com/docs/theme/)
- [Theme setup](https://domphy.com/docs/theme/setup)
- [Theme API](https://domphy.com/docs/theme/api)
