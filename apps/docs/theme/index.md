
# Theme

> **Entire design system and API — one page.**
> Most UI libraries (MUI, Chakra, Ant Design) require hundreds of pages of documentation just for theming, tokens, and color systems. Domphy's theme package keeps the API surface intentionally small. Everything you need is below.

`@domphy/theme` provides context-aware color, size, and spacing — computed automatically from the DOM tree. No token memorization, no per-component overrides, no runtime contrast checks.

Install:
```bash
npm install @domphy/ui   # includes theme
# or standalone
npm install @domphy/theme
```

---

## Setup

Call `themeApply()` once at mount. It injects a `<style>` tag with CSS variables for all registered themes.

```typescript
import { themeApply } from "@domphy/theme"

// inject into <head> automatically
themeApply()
```

Then set `dataTheme` on any root element:

```typescript
{ div: [App], dataTheme: "light" }
// or
{ div: [App], dataTheme: "dark" }
```

Both `"light"` and `"dark"` are built in. `"dark"` is auto-generated from `"light"` — you don't need to configure it.

`dataTheme` can be set at any nesting level. Children inside it inherit the correct theme automatically.

---

## ThemeInput

All theme data lives in one plain object:

```typescript
type ThemeInput = {
  direction: "lighten" | "darken"   // dark = "lighten", light = "darken"
  colors: Record<string, string[]>  // each color = 12-step array (index 0–11)
  baseTones: Record<string, number> // default tone index per color family
  fontSizes: string[]               // 8 sizes (rem strings)
  custom: Record<string, string | number> // arbitrary extra tokens
}
```

Default `"light"` palettes: `neutral`, `primary`, `secondary`, `info`, `success`, `warning`, `error`, `highlight`, `danger` — each with 12 steps from lightest (0) to darkest (11). The shipped `baseTones` presets currently cover `neutral`, `primary`, `secondary`, `info`, `success`, `warning`, `error`, and `highlight`.

Default font sizes (8 steps, ratio ~1.25):

| Index | 0         | 1         | 2    | 3       | 4         | 5         | 6         | 7         |
| ----- | --------- | --------- | ---- | ------- | --------- | --------- | --------- | --------- |
| rem   | 0.6875rem | 0.8125rem | 1rem | 1.25rem | 1.5625rem | 1.9375rem | 2.4375rem | 3.0625rem |
| px    | 11        | 13        | 16   | 20      | 25        | 31        | 39        | 49        |

---

## API

### `themeApply(el?)`

Injects all registered theme CSS variables into the DOM.

```typescript
themeApply()             // auto-creates <style id="domphy-themes"> in <head>
themeApply(myStyleTag)   // use your own <style> element (Shadow DOM, etc.)
```

Call once on app mount. After `setTheme()` changes, call again to update.

---

### `setTheme(name, input)`

Register or override a theme. Merges deeply — only provide the keys you want to change.

```typescript
import { setTheme } from "@domphy/theme"

// override just the primary color in "light"
setTheme("light", {
  colors: {
    primary: ["#fff", "#e8f4ff", "#c2e0ff", /* ... 12 steps total */],
  },
  baseTones: { primary: 5 },
})

// register a custom brand theme
setTheme("brand", {
  colors: {
    primary: ["#fff", "#f5e6ff", "#e0b3ff", "#c680ff", "#aa4dff", "#8f1aff", "#7300e6", "#5900b3", "#400080", "#2d0059", "#1a0033", "#000"],
    neutral: ["#fff", "#f7f5fa", "#e8e3f0", "#c9c0d9", "#a99dc0", "#8a7ba7", "#6b598e", "#4e3f6b", "#342a4a", "#1e182d", "#0e0c16", "#000"],
  },
  baseTones: { primary: 5, neutral: 5 },
  custom: { brandName: "Acme" }
})
```

Then use it: `{ div: [...], dataTheme: "brand" }` and call `themeApply()`.

---

### `getTheme(name)`

Returns the full `ThemeInput` object for a registered theme. Throws if not found.

```typescript
const light = getTheme("light")
light.colors.primary[6]  // "#0f62fe"
light.baseTones.primary  // 6
```

---

### `createDark(source)`

Generates a dark theme from a light `ThemeInput`. Reverses all color arrays and mirrors `baseTones`.

```typescript
import { createDark, getTheme, setTheme, themeApply } from "@domphy/theme"

setTheme("brand-dark", createDark(getTheme("brand")))
themeApply()
```

`"dark"` is already auto-generated from `"light"` on startup — you only need this for custom themes.

---

### `themeCSS()`

Returns the full CSS string for all registered themes. Useful for SSR.

```typescript
const css = themeCSS()
// '[data-theme="light"] { --primary-0: #fff; --primary-1: ...; ... }
//  [data-theme="dark"]  { --primary-0: #000; ... }'
```

For SSR, inject this into your HTML `<style>` tag server-side.

---

### `themeTokens(name)`

Returns raw token values for a theme as a nested object — useful for inspection or passing to other tools.

```typescript
const tokens = themeTokens("light")
tokens.primary[6]    // "#0f62fe"
tokens.fontSizes[2]  // "1rem"
tokens.custom        // { ... }
```

---

### `themeVars()`

Returns CSS variable references (`var(--...)`) for theme color families, `fontSizes`, and `custom` tokens. Use these in `style` objects so styles always reflect the active theme.

```typescript
const v = themeVars()
v.primary[6]              // "var(--primary-6)"
v.fontSizes[2]            // "var(--fontSize-2)"
v.custom.brandName        // "var(--custom-brandName)"
```

You rarely call this directly — `themeColor` and `themeSize` wrap it for you.

---

### `themeColor(object, tone, color?)`

Returns the CSS variable for a color at a specific tone, resolved from the element's DOM context.

```typescript
import { themeColor } from "@domphy/theme"

style: {
  backgroundColor: (l) => themeColor(l, "inherit"),                    // current tone, neutral
  color:           (l) => themeColor(l, "shift-6"),                    // text — WCAG 4.5:1 guaranteed
  outline:         (l) => `1px solid ${themeColor(l, "shift-3")}`,    // border ~K/2

  // explicit color family
  backgroundColor: (l) => themeColor(l, "inherit", "primary"),
  color:           (l) => themeColor(l, "shift-6", "primary"),
  "&:hover": {
    backgroundColor: (l) => themeColor(l, "increase-1", "primary"),
  },
  "&:focus-visible": {
    boxShadow: (l) => `0 0 0 2px ${themeColor(l, "shift-4", "primary")}`,
  },
}
```

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `object` | `ElementNode \| Listener \| null` | required | Reactive listener or element node |
| `tone` | `ElementTone` | `"inherit"` | Tone shift key |
| `color` | `string` | `"inherit"` → `"neutral"` | Color family name |

**Tone keys:**

| Key | Meaning |
| --- | --- |
| `"inherit"` | Same tone as nearest `dataTone` context ancestor |
| `"base"` | Exact `baseTone` index for this color family, when that preset exists |
| `"shift-N"` | Absolute step N (N = 0–11) |
| `"increase-N"` | Current context tone + N steps |
| `"decrease-N"` | Current context tone − N steps |

**WCAG rule:** In a 12-step palette, any two tones 6 steps apart are guaranteed WCAG 4.5:1 contrast. `shift-0` background + `shift-6` text always passes — no runtime check needed.

**Color families:** `"neutral"` | `"primary"` | `"secondary"` | `"info"` | `"success"` | `"warning"` | `"error"` | `"highlight"` | `"danger"`  
`"danger"` is available as a palette family. If you want to use `themeColor(..., "base", "danger")`, define `baseTones.danger` in your theme first.

---

### `contextColor(object, tone, color?)`

Same as `themeColor` but inherits the color family from the nearest ancestor's `themeColor` context instead of defaulting to `"neutral"`. Used internally by UI patches.

---

### `themeSize(object, size?)`

Returns the CSS variable for a font size, resolved from the element's `dataSize` context.

```typescript
import { themeSize } from "@domphy/theme"

style: {
  fontSize: (l) => themeSize(l, "inherit"),    // current context size
  fontSize: (l) => themeSize(l, "increase-1"), // one step larger
  fontSize: (l) => themeSize(l, "decrease-1"), // one step smaller
}
```

| Key | Meaning |
| --- | --- |
| `"inherit"` | Same size as nearest `dataSize` context ancestor |
| `"increase-N"` | N steps larger (max +8) |
| `"decrease-N"` | N steps smaller (min 0) |

Context propagates via `dataSize` — set it on a parent and all children resolve automatically:

```typescript
{ div: [...], dataSize: "increase-1" }   // all children use one size up
```

---

### `themeSpacing(n)`

Returns a spacing value in `em`. One unit = `fontSize / 4`.

```typescript
import { themeSpacing } from "@domphy/theme"

themeSpacing(1)   // "0.25em"  →  4px at 16px base
themeSpacing(3)   // "0.75em"  → 12px
themeSpacing(6)   // "1.5em"   → 24px
themeSpacing(8)   // "2em"     → 32px
```

At `fontSize: 16px`, 1 unit = 4px — the industry-standard 4pt grid. Because it is `em`-based, all spacing scales automatically when root `font-size` changes (responsive, accessibility zoom).

Wrapping level reference — use these numbers directly in `themeSpacing(n)`:

| Level | paddingBlock | paddingInline | radius | height (1 line) |
| --- | --- | --- | --- | --- |
| w=0 inline | 0 | `themeSpacing(2)` | `themeSpacing(1)` | `themeSpacing(6)` |
| w=1 control | `themeSpacing(1)` | `themeSpacing(3)` | `themeSpacing(2)` | `themeSpacing(8)` |
| w=2 container | `themeSpacing(2)` | `themeSpacing(4)` | `themeSpacing(3)` | `themeSpacing(10)` |
| w=3 section | `themeSpacing(3)` | `themeSpacing(3)` | `themeSpacing(4)` | `themeSpacing(12)` |

---

### `themeName(object)`

Returns the active theme name for an element by walking up the DOM tree to the nearest `dataTheme` ancestor. Defaults to `"light"`.

```typescript
import { themeName } from "@domphy/theme"

const name = themeName(listener)  // "light" | "dark" | your custom name
```

Mostly used internally. Useful when branching logic by theme.

---

## Complete Example

```typescript
import { themeApply, setTheme, createDark, getTheme } from "@domphy/theme"
import { themeColor, themeSize, themeSpacing, themeName } from "@domphy/theme"

// 1. optional: register a custom theme
setTheme("brand", {
  colors: {
    primary: ["#fff","#eef2ff","#c7d2fe","#a5b4fc","#818cf8","#6366f1","#4f46e5","#4338ca","#3730a3","#312e81","#1e1b4b","#000"],
  },
  baseTones: { primary: 5 }
})
setTheme("brand-dark", createDark(getTheme("brand")))

// 2. inject CSS once on mount
themeApply()

// 3. use dataTheme at any root
const page = {
  div: [Header, Main, Footer],
  dataTheme: "brand",
}

// 4. color — one function for all cases
const card = {
  div: [Title, Body],
  dataTone: "shift-2",  // shift this subtree 2 steps darker
  style: {
    padding: themeSpacing(4),
    borderRadius: themeSpacing(3),
    backgroundColor: (l) => themeColor(l, "inherit", "neutral"),
    color:           (l) => themeColor(l, "shift-6", "neutral"),
  }
}

// 5. button — all color roles from one shift value
const button = {
  button: "Submit",
  style: {
    fontSize:        (l) => themeSize(l, "inherit"),
    paddingBlock:    themeSpacing(1),
    paddingInline:   themeSpacing(3),
    borderRadius:    themeSpacing(2),
    backgroundColor: (l) => themeColor(l, "inherit", "primary"),
    color:           (l) => themeColor(l, "shift-6", "primary"),  // WCAG 4.5:1 guaranteed
    outline:         (l) => `1px solid ${themeColor(l, "shift-3", "primary")}`,
    "&:hover": {
      backgroundColor: (l) => themeColor(l, "increase-1", "primary"),
    },
    "&:active": {
      backgroundColor: (l) => themeColor(l, "increase-2", "primary"),
    },
    "&:focus-visible": {
      boxShadow: (l) => `0 0 0 2px ${themeColor(l, "shift-4", "primary")}`,
    },
  }
}
```

---

## SSR

```typescript
import { themeCSS } from "@domphy/theme"

// server.js — inline CSS statically
const html = `
<html>
<head>
  <style>${themeCSS()}</style>
</head>
<body>
  <div data-theme="light">...</div>
</body>
</html>
`

// client.js — no themeApply() needed if server already inlined it
// just mount and attach reactivity as usual
```

---

## Function Summary

| Function | What it does |
| --- | --- |
| `themeApply(el?)` | Inject theme CSS into DOM (call once on mount) |
| `setTheme(name, input)` | Register or override a theme |
| `getTheme(name)` | Get raw theme data |
| `createDark(source)` | Auto-generate dark from light |
| `themeCSS()` | Get full CSS string (SSR) |
| `themeTokens(name)` | Get raw token values |
| `themeVars()` | Get CSS variable references |
| `themeColor(l, tone, color?)` | Reactive color from DOM context |
| `themeSize(l, size?)` | Reactive font size from DOM context |
| `themeSpacing(n)` | Spacing unit in em |
| `themeName(l)` | Active theme name for an element |

