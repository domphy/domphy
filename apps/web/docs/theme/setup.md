# Setup

## Install

```bash
npm install @domphy/core @domphy/theme @domphy/ui
```

`@domphy/core` and `@domphy/theme` are peer dependencies of `@domphy/ui` — all three must be installed. If you only need theme tokens without the UI patches:

```bash
npm install @domphy/core @domphy/theme
```

## Apply Theme CSS

Call `themeApply()` once on the client. It injects a `<style id="domphy-themes">` tag into `<head>`.

```ts
import { themeApply } from "@domphy/theme"

themeApply()
```

If you need to control the target style element, pass one explicitly:

```ts
const styleTag = document.createElement("style")
themeApply(styleTag)
```

That is mainly useful for Shadow DOM or isolated preview roots.

## Choose The Active Theme

Set `dataTheme` on any root element.

```ts
{ div: [App], dataTheme: "light" }
{ div: [App], dataTheme: "dark" }
```

`light` and `dark` are built in. `dark` is derived **once at module init** from `light` (each ramp reversed, each `baseTones` index mirrored, `direction: "lighten"`). `setTheme` does not repeat that step.

`dataTheme` can appear at any nesting level. Descendants inside that subtree resolve colors from the nearest theme root.

## Register A Custom Theme

Use `setTheme()` to register or override a theme. All fields are optional — unspecified ones inherit from `light`.

### Replace a built-in color family

Override an existing family (e.g. swap `primary` to a violet ramp):

```ts
import { setTheme, themeApply } from "@domphy/theme"

setTheme("brand", {
  colors: {
    primary: ["#ffffff", "#f7f5ff", "#efe8ff", "#e5d9ff", "#d6c2ff", "#c4a6ff", "#af87ff", "#9a6dff", "#8658ff", "#7345f7", "#6033df", "#512bc0", "#43249e", "#351c7d", "#28155d", "#1c0e3f", "#0e0720", "#000000"],
  },
  baseTones: {
    primary: 9,
  },
})

themeApply()
```

### Add a brand-new color family

A new `colors` key is valid on any theme name, but **`themeColor()` does not pick it up from `"brand"` alone.** `themeVars()` always reads `getTheme("light")` and emits the shared `var(--…)` baseline; `themeColor` throws unless the role is also registered on `"light"`.

```ts
import { setTheme, themeApply, themeColor } from "@domphy/theme"

const gold = [
  "#fffef0", // 0 — near-white
  "#fffbd0",
  "#fff6a0",
  "#ffee65",
  "#ffe030",
  "#f5cc00",
  "#d9b200",
  "#bf9a00",
  "#a58200",
  "#8a6b00", // 9 — accent zone
  "#705600",
  "#574200",
  "#3f2f00",
  "#2d1f00",
  "#1f1500",
  "#130d00",
  "#070400",
  "#000000", // 17 — black
]

// Required: the light structure is what themeVars()/themeColor() key on.
setTheme("light", {
  colors: { "brand-gold": gold },
  baseTones: { "brand-gold": 9 },
})

// Optional named theme — starts as a clone of light, then deep-merges.
setTheme("brand", {
  colors: { "brand-gold": gold },
  baseTones: { "brand-gold": 9 },
})

themeApply()

const GoldBadge = {
  span: "New",
  style: {
    background: (l) => themeColor(l, "shift-2", "brand-gold"),
    color: (l) => themeColor(l, "shift-11", "brand-gold"),
  },
}
```

Ramps must be 18 steps (`TONE_STEPS`). On a `direction: "darken"` theme, index 0 is lightest and 17 is darkest.

`setTheme` does **not** reverse into `"dark"` and does **not** create a dark sibling for `"brand"`. The built-in `"dark"` pair was reversed from `"light"` once at module init (`createDark` is private, not exported). To use the family in dark mode, register it on `"dark"` yourself:

```ts
setTheme("dark", {
  colors: { "brand-gold": [...gold].reverse() },
  baseTones: { "brand-gold": 17 - 9 },
})
```

Then activate a named theme when you have one:

```ts
{ div: [App], dataTheme: "brand" }
```

### Custom design tokens

Arbitrary key-value tokens can be stored under `custom`. They appear as `--custom-{key}` CSS variables:

```ts
setTheme("light", {
  custom: {
    "border-radius-pill": "9999px",
    "sidebar-width": "240px",
    "topbar-height": "56px",
  },
})

// themeVars() reads getTheme("light") — keys registered only on another
// theme name do not appear here.
import { themeVars } from "@domphy/theme"
const vars = themeVars()
// vars.custom["border-radius-pill"] === "var(--custom-border-radius-pill)"
```

## SSR

For SSR, inline `themeCSS()` on the server.

```ts
import { themeCSS } from "@domphy/theme"

const html = `<!DOCTYPE html>
<html>
  <head>
    <style id="domphy-themes">${themeCSS()}</style>
  </head>
  <body>
    <div data-theme="light">...</div>
  </body>
</html>`
```

If the CSS is already in the HTML, the client usually does not need to call `themeApply()` again unless you later change registered themes.

For the full API surface, see [API](./api).
