# API

This page lists the public helpers exported by `@domphy/theme`.

## Common Runtime Helpers

### `themeColor(object, tone?, color?)`

Resolve a color variable from the current theme and tone context.

```ts
backgroundColor: (listener) => themeColor(listener, "inherit", "primary")
color: (listener) => themeColor(listener, "shift-6", "primary")
```

Use this for text color, background color, outline color, and interaction states.

### `themeSize(object, size?)`

Resolve a font size from the nearest `dataSize` context.

```ts
fontSize: (listener) => themeSize(listener, "inherit")
fontSize: (listener) => themeSize(listener, "increase-1")
```

### `themeDensity(object)`

Resolve the current density factor from the nearest `dataDensity` context.

```ts
const d = themeDensity(listener)

paddingBlock: themeSpacing(d * 1)
paddingInline: themeSpacing(d * 3)
```

`themeDensity()` returns a `number`, not a CSS value.

### `themeSpacing(n)`

Return a spacing value in `em`.

```ts
gap: themeSpacing(3)
minWidth: themeSpacing(32)
height: themeSpacing(6)
```

## Setup Helpers

### `themeApply(el?)`

Inject the CSS for all registered themes into the DOM.

```ts
themeApply()
themeApply(styleTag)
```

### `themeCSS()`

Return the CSS string for all registered themes. Mostly used for SSR.

```ts
const css = themeCSS()
```

### `setTheme(name, input)`

Register or override a theme.

```ts
setTheme("brand", {
  colors: {
    primary: ["#fff", "..."],
  },
})
```

### `getTheme(name)`

Return the full theme object.

```ts
const brand = getTheme("brand")
```

### `createDark(source)`

Generate a dark theme from an existing theme object.

```ts
setTheme("brand-dark", createDark(getTheme("brand")))
```

## Token Helpers

### `themeVars()`

Return CSS variable references such as `var(--primary-6)` and `var(--fontSize-2)`.

### `themeTokens(name)`

Return the raw token object of a registered theme.

### `themeName(object)`

Return the active theme name for the current node or listener.

### `contextColor(object, tone?, color?)`

Like `themeColor()`, but inherits the color family from context instead of defaulting to `neutral`.

This is mainly useful for internal patch composition.

## Theme Shape

`setTheme()` accepts a partial `ThemeInput`.

```ts
type ThemeInput = {
  direction: "lighten" | "darken"
  colors: Record<string, string[]>
  baseTones: Record<string, number>
  fontSizes: string[]
  densities: number[]
  custom: Record<string, string | number>
}
```

For how tone and size resolution work, see [Tone](./tone) and [Size](./size).
