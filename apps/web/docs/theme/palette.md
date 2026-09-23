<script setup lang="ts">

import Palette from "../demos/theme/Palette.ts?raw"
</script>

# Palette

Visual reference for all color families in the built-in `light` theme.

Each family is a sequential 18-step ramp built with [Chromametry](https://github.com/chromametry/chromametry), guaranteeing WCAG 4.5:1 contrast (K = 9). Hover a swatch to see its CSS variable name.

<CodeEditor :code="Palette" />

## CSS Variables

Colors are exposed as CSS custom properties scoped to `[data-theme]` (plus `:root` for the default `light` theme, so a page without the attribute still resolves them):

```
--{family}-{step}
```

On the built-in `light` theme (stock `primary` in `light.ts`):

- `--primary-0` is white (`#ffffff`, lightest)
- `--primary-17` is black (`#000000`, darkest)
- steps `8–9` sit near the mid-range — the base accent zone

Example:

```css
background-color: var(--primary-9);
color: var(--primary-0);
```

## Color Families

| Family | Description |
| --- | --- |
| `neutral` | default family for surfaces, text, and boundaries |
| `primary` | main accent for selected state and focus emphasis |
| `secondary` | alternate accent when primary would clash |
| `info` | informational state and non-critical notices |
| `success` | positive state, confirmed action, completed status |
| `warning` | caution state, non-destructive attention UI |
| `attention` | heightened caution, stronger than warning |
| `error` | invalid input, error state, failure feedback |
| `danger` | destructive actions such as delete or remove |
| `highlight` | marked content and featured emphasis |

## Dark Theme

The built-in `dark` theme is **derived** from `light` (private `createDark`: reverse each ramp, mirror each `baseTones` index, `direction: "lighten"`), and that derivation re-runs on every `setTheme("light", …)` — so a new ramp or a whole new color role applied to `light` reaches dark mode automatically. Explicit `setTheme("dark", …)` overrides are replayed on top of each rebuild. `setTheme` does **not** create a dark sibling for a *named* theme.

After reverse, CSS variable **indices stay put** — the **values** swap ends. Stock `primary`:

| CSS var | Light (`light.ts`) | Dark (after reverse) |
| --- | --- | --- |
| `--primary-0` | first stop (`#ffffff`) | light's last stop (`#000000`) |
| `--primary-17` | last stop (`#000000`) | light's first stop (`#ffffff`) |
| `--primary-N` | light `[N]` | light `[17 − N]` |
| `baseTones.primary` | `9` | `8` (`17 − 9`) |

The same `--{family}-{step}` **names** work in both themes because each `[data-theme]` block supplies its own values. A custom theme registered with `setTheme("brand", …)` is a separate entry — give it a dark sibling yourself if you need one. Full contract: [Setup](./setup).

## Custom Palette

Register a theme with `setTheme()` to replace any color family or add entirely new ramps. Custom ramps should follow the 18-step model. A **new** family name must also be registered on `"light"` — `themeVars()` / `themeColor()` key on that structure and throw otherwise (see [Setup](./setup)).

You don't have to hand-pick the 16 intermediate steps yourself — `generateTheme` builds the whole `ThemeInput` from one base hex per role, using the built-in WCAG-optimized `generateRamp` (see [`generateRamp`](../palette/generator)):

```ts
import { generateTheme, setTheme, themeApply } from "@domphy/theme"

setTheme("brand", generateTheme({
  primary: "#4a7ff4",
  secondary: "#d8597d",
  neutral: "#8d8d8d",
}))

themeApply()
```

That registers `"brand"` only. It does **not** reverse those ramps into `"dark"`. To update the built-in pair, `setTheme("light", …)` and `setTheme("dark", …)` separately (reverse each ramp, `baseTones` → `17 − index`, `direction: "lighten"`).

`baseTones` is filled in automatically — the step closest (CIEDE2000) to the hex you passed in.

To assemble a ramp by hand instead, pass the 18 hex strings directly:

```ts
import { setTheme, themeApply } from "@domphy/theme"

setTheme("brand", {
  colors: {
    primary: [
      "#ffffff",
      // ... 16 intermediate steps ...
      "#000000",
    ],
  },
  baseTones: {
    primary: 9,
  },
})

themeApply()
```

See [Setup → Register A Custom Theme](./setup#register-a-custom-theme) for the full example.
