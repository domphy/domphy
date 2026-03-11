# Setup

## Install

```bash
npm install @domphy/ui
```

Or install the package directly:

```bash
npm install @domphy/theme
```

`@domphy/ui` already includes `@domphy/theme`.

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

`light` and `dark` are built in. `dark` is generated automatically from `light`.

`dataTheme` can appear at any nesting level. Descendants inside that subtree resolve colors from the nearest theme root.

## Register A Custom Theme

Use `setTheme()` to register or override a theme.

```ts
import { setTheme, themeApply } from "@domphy/theme"

setTheme("brand", {
  colors: {
    primary: ["#fff", "#eef2ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81", "#1e1b4b", "#000"],
  },
  baseTones: {
    primary: 5,
  },
})

themeApply()
```

Then use it:

```ts
{ div: [App], dataTheme: "brand" }
```

## Generate Dark From Light

Use `createDark()` when you want a dark variant of a custom theme.

```ts
import { createDark, getTheme, setTheme } from "@domphy/theme"

setTheme("brand-dark", createDark(getTheme("brand")))
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
