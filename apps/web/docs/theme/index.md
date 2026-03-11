<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Overview from "../demos/theme/Overview.ts?raw"
</script>

# Theme

`@domphy/theme` provides the design tokens used by Domphy.

It is responsible for:

- theme colors through `dataTheme`
- local tone shifts through `dataTone`
- local size shifts through `dataSize`
- spacing values that scale with font size

The package stays small on purpose. In normal usage, most code only touches three helpers:

- `themeColor()` for colors
- `themeSize()` for font size
- `themeSpacing()` for spacing and radius

<CodeEditor :code="Overview" />

## Basic Usage

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

This is the main mental model:

- `themeSpacing(n)` gives reusable spacing units
- `themeSize(listener, key)` resolves size from the nearest `dataSize` context
- `themeColor(listener, tone, color?)` resolves color from theme and tone context

## What To Read Next

1. [Setup](./setup) for `themeApply()`, `dataTheme`, custom themes, and SSR
2. [Tone](./tone) for the color and contrast model
3. [Size](./size) for sizing and spacing rules
4. [API](./api) for the full function reference
