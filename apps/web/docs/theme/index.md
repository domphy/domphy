<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Overview from "../demos/theme/Overview.ts?raw"
</script>

# Theme

`@domphy/theme` provides the design tokens and context-aware resolvers used by Domphy.

It is responsible for:

- theme colors through `dataTheme`
- local tone shifts through `dataTone`
- local size shifts through `dataSize`
- local density shifts through `dataDensity`
- final spacing values through `themeSpacing()`

In normal usage, most code only touches four helpers:

- `themeColor()` for colors
- `themeSize()` for font size
- `themeDensity()` for the current density factor
- `themeSpacing()` for final spacing values

<CodeEditor :code="Overview" />

## Basic Usage

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

Main mental model:

- `themeDensity(listener)` returns the local density factor from `dataDensity`
- `themeSpacing(n)` converts the final numeric result into a CSS spacing value
- `themeSize(listener, key)` resolves size from the nearest `dataSize` context
- `themeColor(listener, tone, color?)` resolves color from theme and tone context

## What To Read Next

1. [Setup](./setup) for `themeApply()`, `dataTheme`, custom themes, and SSR
2. [Tone](./tone) for the color and contrast model
3. [Size](./size) for sizing and density rules
4. [API](./api) for the full function reference
