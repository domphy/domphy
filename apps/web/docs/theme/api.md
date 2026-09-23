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

`object` may be `null` — that form silently resolves against the `"light"` theme with no node context. The value is baked at call time and will **not** follow a later theme switch. Prefer `resolveThemeColor({ theme, tone, color })` when you mean a specific named theme.

### `resolveThemeColor({ theme?, tone?, surface?, color? })`

Explicit non-reactive token resolution — the supported form of `themeColorToken(null, …)`. Returns the resolved token value (e.g. `"#4a7ff4"`) for a **named** theme, with no `ElementNode` / listener context.

```ts
import { resolveThemeColor } from "@domphy/theme"

const hex = resolveThemeColor({ theme: "light", tone: "shift-9", color: "primary" })
const darkSurface = resolveThemeColor({ theme: "dark", tone: "inherit" })
const muted = resolveThemeColor({ tone: "muted" }) // defaults: theme "light", color "inherit" → "neutral"

// Text on a dark-anchored panel, resolved the way the runtime paints it:
const onPanel = resolveThemeColor({ surface: "shift-17", tone: "shift-9" })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `string` | `"light"` | Theme name registered via `setTheme()` (`"light"`, `"dark"`, …). |
| `tone` | `ElementTone` | `"inherit"` | Tone to resolve. `"base"` uses that role's `baseTones` entry. Semantic aliases (`"muted"`, `"text"`, …) work. |
| `surface` | `ElementTone` | `"inherit"` | The `dataTone` of the surface to resolve against. There is no live inheritance — pass the context you want. |
| `color` | `string` | `"inherit"` | Color role. `"inherit"` maps to `"neutral"`. |

The returned value is baked at call time — it does **not** follow later theme switches. For reactive, context-aware colors use `themeColor()` with a listener. Throws if the theme name or color role is unknown.

### `resolveToneStep({ theme?, surface?, tone?, color? })`

The numeric half of `resolveThemeColor`: the **ramp index** (`0` … `TONE_STEPS - 1`) a tone resolves to. For tooling that needs the step rather than the token — contrast checks, `@domphy/doctor` rules, theme editors.

```ts
import { resolveToneStep } from "@domphy/theme"

// On a `dataTone: "shift-17"` surface, "shift-9" does NOT land on step 9:
resolveToneStep({ surface: "shift-17", tone: "shift-9" })   // → 7
resolveToneStep({ surface: "shift-17", tone: "increase-2" }) // → 17 (clamped)
resolveToneStep({ theme: "dark", tone: "inherit" })          // → 1 (edge darkBias)
```

Reading a `themeColor()` result off a listener with no node always gives context `0`, which is wrong on any element that declares `dataTone`: the tone arithmetic reverses past the ramp midpoint and clamps at both ends. `resolveToneStep` takes the surface explicitly and runs the same arithmetic `themeColor()` runs at paint time, so the answer matches the browser — including the theme's edge `darkBias`.

Options are the same as `resolveThemeColor`; `color` is only consulted for `tone: "base"`.

### `textToneOn(surfaceShift, object?)`

```ts
textToneOn(surfaceShift: number, object?: ElementNode | Listener | null): ElementTone
```

The tone that reads as body text on a surface painted at `shift-<surfaceShift>` — `CONTRAST_SPAN` steps away from the fill, on whichever side of it stays on the ramp.

`"text"` (`shift-9`) is only AA-safe against an *unshifted* surface. An interactive control that paints its own fill moves that surface out from under the label — hover `+2`, pressed `+2`/`+3`, selected `+3` — while an absolute `"text"` stays put and the gap collapses to 7 or 6. Measured on the default neutral ramp (light): `shift-9` on a `shift-2` hover fill is `3.58:1`, below WCAG AA.

```ts
"&:hover": {
  backgroundColor: (l) => themeColor(l, "hover", color),    // shift-2
  color: (l) => themeColor(l, textToneOn(2), color),        // shift-11
}
```

Because the result is a `shift-N` tone, it resolves against the same `dataTone` context as the fill — the `K`-step gap holds on light *and* dark surface anchors. This is the code form of the [Tone Roles](./tone#tone-roles) rule "*Text: the tone plus or minus `K`*"; every stock `@domphy/ui` control that shifts its own background uses it.

Deep fills flip the direction. A shape filled at `shift-12` — a chart wedge, a solid dark button — needs a *lighter* label, so `textToneOn(12)` returns `shift-3`, not the non-existent `shift-21`. `surfaceShift` is clamped to a real ramp step, so every input returns a valid tone.

**Pass `object` (the same `ElementNode`/`Listener` `themeColor()`'s first argument takes) whenever you have one.** Without it, `surfaceShift` is folded in UNBIASED ramp space — exact when the runtime resolves the tone from an unshifted context with no `darkBias` (the light theme's default surface), but on a `darkBias`-lifted context (the built-in dark theme) the gap can fall short by up to `darkBias` steps: `shift-8` under the built-in dark theme actually resolves to ramp step 9, whose farthest reachable *tone name* is only 8 away (`3.55:1` worst role — the mid-ramp case `@domphy/doctor`'s `middle-surface-anchor` rule already warns about). `object` closes this exactly: it resolves the fill's real post-bias ramp step the same way `themeColor()` will, then returns an absolute ramp index exactly `CONTRAST_SPAN` steps away — a literal index is the only way to express "K steps away" from a bias-folded fill, since no relative `shift-N` *name* can reach past the fold. `offsetTone()` passes a number straight through, so an absolute index is still a valid `ElementTone` everywhere `textToneOn()`'s result is used.

```ts
"&:hover": {
  backgroundColor: (l) => themeColor(l, "hover", color),
  color: (l) => themeColor(l, textToneOn(2, l), color),   // bias-exact on any theme
}
```

### `themeSize(object, size?)`

Resolve a font size from the nearest `dataSize` context. `object` must be an `ElementNode` or a `Listener` — unlike `themeColor`, it does **not** accept `null`.

```ts
fontSize: (listener) => themeSize(listener, "inherit")
fontSize: (listener) => themeSize(listener, "increase-1")
```

### `themeFont(family?)`

Return the `var(--fontFamily-…)` reference for a named font stack — `"sans-serif"` (default) or `"monospace"`. Takes no listener: a font stack has no context attribute to inherit from, and the returned `var()` already follows `[data-theme]` at paint time.

```ts
fontFamily: themeFont("monospace")
```

The themed root already carries `"sans-serif"`, so use this only to opt OUT of the inherited stack.

### `themeWeight(weight?)`

Return the `var(--fontWeight-…)` reference for a named weight: `"light"` `300`, `"regular"` `400` (default), `"medium"` `500`, `"semibold"` `600`, `"bold"` `700`, `"extrabold"` `800`, `"black"` `900`.

```ts
fontWeight: themeWeight("semibold")
```

### `themeLetterSpacing(spacing?)`

Return the `var(--letterSpacing-…)` reference for a named tracking step: `"tighter"` `-0.05em`, `"tight"` `-0.025em`, `"normal"` (default), `"wide"` `0.025em`, `"wider"` `0.05em`, `"widest"` `0.1em`. Values are `em`-relative, so tracking scales with the element's resolved `themeSize()`.

```ts
letterSpacing: themeLetterSpacing("tight")
```

All three throw on a name the `"light"` theme does not register, listing the ones it does — `themeVars()` is keyed on the light theme's token structure, so register custom names there (`setTheme("light", { fontWeights: { … } })`). See [Typography](./typography) for the full scales and when to prefer a patch.

### `themeDensity(object)`

Resolve the current density factor from the nearest `dataDensity` context. `object` accepts an `ElementNode`, a `Listener`, or `null`. Pass `null` to resolve against the default density with no context.

```ts
const d = themeDensity(listener)

paddingBlock: themeSpacing(d * 1)
paddingInline: themeSpacing(d * 3)
```

`themeDensity()` returns a `number`, not a CSS value.

### `themeSpacing(n)`

Return a CSS `calc(n/4 em)` string. The result is wrapped in `calc()` to preserve composability.

```ts
gap: themeSpacing(3)
minWidth: themeSpacing(32)
height: themeSpacing(6)
```

### `themeFluidSpacing(min, max, viewportMin?, viewportMax?)`

Return a CSS `clamp()` that scales between `themeSpacing(min)` and `themeSpacing(max)` across a viewport width range (default 320 px → 1280 px). Use for structural spacing — page padding, section gaps — that should grow with the viewport.

```ts
import { themeFluidSpacing } from "@domphy/theme"

padding: themeFluidSpacing(4, 16)    // 1em at 320px → 4em at 1280px
gap: themeFluidSpacing(4, 8)         // 1em at 320px → 2em at 1280px
```

Do not use fluid spacing for bounded-control padding (buttons, inputs) — use `themeSpacing(themeDensity(l) * n)` instead.

### `applySystemTheme(targetEl?, options?)`

Detect the OS color-scheme preference, apply `data-theme` to `targetEl` (default: `document.documentElement`), and set up a listener for OS-level changes. Returns a cleanup function that removes the listener.

```ts
import { applySystemTheme } from "@domphy/theme"

// One-liner: reads localStorage first, falls back to OS preference
const cleanup = applySystemTheme()

// Custom target or storage key
const cleanup = applySystemTheme(document.getElementById("app")!, {
  storageKey: "my-theme",
})
```

Options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `persist` | `boolean` | `true` | Honour an existing `"light"`/`"dark"` value under `storageKey`; the helper never writes — the caller persists a user choice via `localStorage.setItem` |
| `storageKey` | `string` | `"dp-theme"` | `localStorage` key |

Throws an actionable error when called without a DOM (SSR). Reading `localStorage` can itself **throw** where storage is blocked or partitioned — a sandboxed `<iframe>` without `allow-same-origin`, blocked third-party cookies, Safari private mode — so the read is guarded and falls back to the OS preference.

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
// :root,
// [data-theme="light"] { color-scheme: light; --neutral-0: #ffffff; … }
// [data-theme="dark"]  { color-scheme: dark;  --neutral-0: #000000; … }
```

The `light` theme is also emitted on `:root`, so a page that never sets `data-theme` still resolves every token instead of rendering unstyled. `:root` and `[data-theme="…"]` have the same specificity and the light block is emitted first, so a `data-theme` on `<html>` still wins.

Each block carries `color-scheme` (derived from the theme's `direction`) so native scrollbars and form controls follow the theme — see [Dark Mode](./dark-mode#color-scheme-property).

### `setTheme(name, input)`

Register or override a theme. Validates the payload and throws on a malformed one (wrong ramp length, non-integer `baseTones`, values containing `;` / `}` / `</style`).

```ts
setTheme("brand", {
  colors: {
    primary: ["#fff", "..."],
  },
})
```

`setTheme("light", …)` also re-derives the built-in `"dark"` theme from the new `"light"` (ramps reversed, `baseTones` mirrored), replaying any explicit `setTheme("dark", …)` on top — so a brand palette or a new color role applied to `"light"` reaches dark mode without a second call. See [Setup](./setup#choose-the-active-theme).

### `getTheme(name)`

Return the full theme object.

```ts
const brand = getTheme("brand")
```

### `generateTheme(baseColors, options?)`

Build a `PartialThemeInput` from one base hex color per semantic role,
using the built-in palette engine's `generateRamp` for every family — see
[Theme Builder](./builder) for a live demo and [`DESIGN.md`](https://github.com/domphy/domphy/blob/main/DESIGN.md)
for the math.

```ts
import { generateTheme, setTheme, type GenerateThemeOptions } from "@domphy/theme"

setTheme("brand", generateTheme({
  primary: "#4a7ff4",
  secondary: "#d8597d",
  neutral: "#8d8d8d",
}))
```

`options` is `GenerateThemeOptions`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `steps?` | `number` | `TONE_STEPS` (`18`) | Ramp length. Must be `TONE_STEPS` or omitted — any other value **throws**. `generateRamp` accepts any `N`; `generateTheme` does not. |
| `direction?` | `"lighten" \| "darken"` | `"darken"` | Theme direction metadata. |
| `fontSizes?` | `string[]` | `["0.75rem", "0.875rem", "1rem", "1.25rem", "1.5625rem", "1.9375rem", "2.4375rem", "3.0625rem"]` | Size scale consumed by `themeSize()`. |
| `densities?` | `number[]` | `[0.75, 1, 1.5, 2, 2.5]` | Density scale consumed by `themeDensity()`. |
| `darkBias?` | `number` | `1` | Tone offset applied at the dark edge. |
| `custom?` | `Record<string, string \| number>` | `{}` | Custom tokens (`--custom-{key}`). |

```ts
const options: GenerateThemeOptions = {
  direction: "darken",
  darkBias: 1,
  custom: { "sidebar-width": "240px" },
}
generateTheme({ primary: "#4a7ff4" }, options)
```

Each role's `baseTones` entry is picked automatically (nearest CIEDE2000
match to the input color). Roles you don't pass are simply absent from the
result — `setTheme()` deep-merges the rest from whatever theme `name`
already had (or `light`, if `name` is new).

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
  fontFamilies: Record<string, string>   // --fontFamily-{name},    themeFont()
  fontWeights: Record<string, string>    // --fontWeight-{name},    themeWeight()
  letterSpacings: Record<string, string> // --letterSpacing-{name}, themeLetterSpacing()
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
| `GenerateThemeOptions` | Optional second argument to `generateTheme()`: `steps?` (must be `TONE_STEPS` `18` or omitted), `direction?`, `fontSizes?`, `densities?`, `darkBias?`, `custom?`. |
| `ThemeVars` | Object of `var(--…)` CSS variable references returned by `themeVars()`. |
| `ThemeColor` | `ColorRole \| (string & {})` — the 10 built-in role names rank first in editor autocomplete/hover, but any string still type-checks (custom themes may register their own role names via `setTheme`/`generateTheme`). This is intentionally NOT a strict union — see `ColorRole` below for the exhaustive list. |
| `ColorRole` | Strict union of the 10 built-in semantic role names: `"neutral" \| "primary" \| "secondary" \| "info" \| "success" \| "warning" \| "attention" \| "error" \| "danger" \| "highlight"`. Derived from `COLOR_ROLES` below. |
| `ElementTone` | Valid tone descriptor strings: `"inherit"`, `"base"`, `"shift-N"`, `"increase-N"`, `"decrease-N"`, or a semantic alias (`"surface"`, `"hover"`, `"border"`, `"border-strong"`, `"muted"`, `"text"`) — see [Semantic Aliases](./tone#semantic-aliases). |
| `ElementTones` | Runtime array of all valid tone strings (exported as a value for validation tooling). |
| `ElementSize` | Valid size descriptor strings: `"inherit"`, `"increase-N"`, `"decrease-N"` (N 0–7). |
| `ElementDensity` | Valid density descriptor strings: `"inherit"`, `"increase-N"`, `"decrease-N"` (N 0–4). |
| `FontFamily` | Font stack names — `"sans-serif" \| "monospace" \| (string & {})`, same loose-autocomplete shape as `ThemeColor`. Source array: `FONT_FAMILIES`. |
| `FontWeight` | Weight names — `"light" \| "regular" \| "medium" \| "semibold" \| "bold" \| "extrabold" \| "black" \| (string & {})`. Source array: `FONT_WEIGHTS`. |
| `LetterSpacing` | Tracking names — `"tighter" \| "tight" \| "normal" \| "wide" \| "wider" \| "widest" \| (string & {})`. Source array: `LETTER_SPACINGS`. |

`COLOR_ROLES` — runtime `readonly` array of the same 10 names (`ColorRole`'s source of truth: `type ColorRole = (typeof COLOR_ROLES)[number]`). Use this instead of hand-listing the 10 roles when you need them as a real iterable (e.g. rendering one control per role).

## Constants

| Export | Value | Description |
| --- | --- | --- |
| `TONE_STEPS` | `18` | Ramp length every `colors[role]` array must have. `generateTheme({ steps })` throws unless this value or omitted. |
| `CONTRAST_SPAN` | `9` | The ramp's contrast span `K`: every pair of steps this far apart clears WCAG `4.5:1`, everywhere on every built-in ramp. Derived in [DESIGN.md §2.1](https://github.com/huukhanhnguyen/domphy/blob/main/DESIGN.md); pair a shifted fill with `textToneOn()` rather than adding `9` by hand. |
| `ToneAliases` | `{ surface, hover, border, border-strong, muted, text }` | Semantic tone names → `shift-N`. Table: [Semantic Aliases](./tone#semantic-aliases). |
| `COLOR_ROLES` | 10 built-in role names | Source of `ColorRole`. |
| `FONT_FAMILIES` | `["sans-serif", "monospace"]` | Font-stack names the built-in themes register; source of `FontFamily`. |
| `FONT_WEIGHTS` | `["light", "regular", "medium", "semibold", "bold", "extrabold", "black"]` | Weight names (300 → 900); source of `FontWeight`. |
| `LETTER_SPACINGS` | `["tighter", "tight", "normal", "wide", "wider", "widest"]` | Tracking names; source of `LetterSpacing`. |
