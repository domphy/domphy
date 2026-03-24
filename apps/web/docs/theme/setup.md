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
    primary: ["#ffffff", "#f7f5ff", "#efe8ff", "#e5d9ff", "#d6c2ff", "#c4a6ff", "#af87ff", "#9a6dff", "#8658ff", "#7345f7", "#6033df", "#512bc0", "#43249e", "#351c7d", "#28155d", "#1c0e3f", "#0e0720", "#000000"],
  },
  baseTones: {
    primary: 9,
  },
})

themeApply()
```

Custom color ramps should follow the current 18-step model.

Then use it:

```ts
{ div: [App], dataTheme: "brand" }
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
