# @domphy/theme

Context-aware color, size, and spacing for Domphy.

It provides:

- `themeColor()` for colors
- `themeSize()` for font size
- `themeSpacing()` for spacing and radius

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
import { themeColor, themeSize, themeSpacing } from "@domphy/theme"

const button = {
  button: "Save",
  style: {
    fontSize: (listener) => themeSize(listener, "inherit"),
    paddingBlock: themeSpacing(1),
    paddingInline: themeSpacing(3),
    borderRadius: themeSpacing(2),
    backgroundColor: (listener) => themeColor(listener, "inherit", "primary"),
    color: (listener) => themeColor(listener, "shift-6", "primary"),
  },
}
```

## Theme Registry

```ts
import { setTheme, getTheme, createDark } from "@domphy/theme"

setTheme("brand", {
  colors: {
    primary: ["#fff", "#eef2ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81", "#1e1b4b", "#000"],
  },
  baseTones: {
    primary: 5,
  },
})

setTheme("brand-dark", createDark(getTheme("brand")))
```

## Docs

- [Theme guide](https://www.domphy.com/docs/theme/)
- [Theme setup](https://www.domphy.com/docs/theme/setup)
- [Theme API](https://www.domphy.com/docs/theme/api)
