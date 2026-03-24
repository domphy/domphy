<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Palette from "../demos/theme/Palette.ts?raw"
</script>

# Palette

Visual reference for all color families in the built-in `light` theme.

Each family is a sequential 18-step ramp built with [Chromametry](https://github.com/chromametry/chromametry), guaranteeing WCAG 4.5:1 contrast (K = 9). Hover a swatch to see its CSS variable name.

<CodeEditor :code="Palette" />

## CSS Variables

Colors are exposed as CSS custom properties scoped to `[data-theme]`:

```
--{family}-{step}
```

- step `0` is always white (lightest)
- step `17` is always black (darkest)
- step `8–9` is near the mid-range — the base accent zone

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

The built-in `dark` theme is auto-generated from `light` by reversing each ramp:

| Light | Dark |
| --- | --- |
| step `0` (lightest) | becomes step `17` (darkest) |
| step `9` (accent) | becomes equivalent dark accent |
| step `17` (darkest) | becomes step `0` (lightest) |

The dark theme is generated automatically by reversing the color array. You never need separate color values for dark mode — the same `--{family}-{step}` variables work in both themes, and the theme layer handles the inversion automatically.

For custom themes and the full setup, see [Setup](./setup).

## Custom Palette

Register a theme with `setTheme()` to replace any color family or add entirely new ramps. Custom ramps should follow the 18-step model.

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
