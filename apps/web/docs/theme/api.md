# API

This page lists the public helpers exported by `@domphy/theme`.

## Common Runtime Helpers

### `themeColor(object, tone?, color?)`

Resolve a color CSS variable reference (`var(--…)`) from the current theme and tone context.

```ts
backgroundColor: (listener) => themeColor(listener, "inherit", "primary")
color: (listener) => themeColor(listener, "shift-9", "primary")
```

`object` accepts an `ElementNode`, a `Listener`, or `null`. Pass `null` to resolve against the `light` theme with no context.

Use this for text color, background color, outline color, and interaction states.

### `themeColorToken(object, tone?, color?)`

Same signature as `themeColor` but returns the resolved token **value** (e.g. `"#4a7ff4"`) instead of a `var(--…)` CSS reference. Use at design-time or when integrating with third-party APIs that require a concrete color string.

```ts
const hex = themeColorToken(null, "shift-9", "primary") // e.g. "#4a7ff4"
```

`object` may be `null` — resolves against the `light` theme with no node context.

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

## Token Helpers

### `themeVars()`

Return CSS variable references such as `var(--primary-6)` and `var(--fontSize-2)`.

### `themeTokens(name)`

Return the raw token object of a registered theme.

### `themeName(object)`

Return the active theme name for the current node or listener.

## Theme Shape

`setTheme()` accepts a partial `ThemeInput`.

```ts
type ThemeInput = {
  direction: "lighten" | "darken"
  colors: Record<string, string[]>
  baseTones: Record<string, number>
  fontSizes: string[]
  densities: number[]
  darkBias: number
  custom: Record<string, string | number>
}
```

For how tone and size resolution work, see [Tone](./tone) and [Size](./size).

## Exported Types

| Type | Description |
| --- | --- |
| `ThemeInput` | Full theme shape accepted by `setTheme()`. All fields are optional when passing a partial. |
| `PartialThemeInput` | Deep-partial version of `ThemeInput` — what `setTheme()` actually accepts at runtime. |
| `ThemeVars` | Object of `var(--…)` CSS variable references returned by `themeVars()`. |
| `ThemeColor` | Union of valid color family names (`"neutral" \| "primary" \| …`) derived from `ThemeInput["colors"]`. |
| `ElementTone` | Valid tone descriptor strings: `"inherit"`, `"base"`, `"shift-N"`, `"increase-N"`, `"decrease-N"`. |
| `ElementTones` | Runtime array of all valid tone strings (exported as a value for validation tooling). |
| `ElementSize` | Valid size descriptor strings: `"inherit"`, `"increase-N"`, `"decrease-N"` (N 0–7). |
| `ElementDensity` | Valid density descriptor strings: `"inherit"`, `"increase-N"`, `"decrease-N"` (N 0–4). |
