# Size

Domphy keeps `size`, `density`, and `spacing` separate, but they work together in one sizing model.

The base unit is:

`U = fontSize / 4`

At `fontSize: 16px`, `U = 4px`.

Use:

- `themeSize(listener, key)` to resolve font size from `dataSize`
- `themeDensity(listener)` to resolve the current density factor from `dataDensity`
- `themeSpacing(n)` to convert the final numeric result into CSS units

## Overview

Think of the sizing pipeline like this:

1. `themeSize()` sets the local text scale
2. that font size defines `U`
3. `themeDensity()` changes how compact or loose the geometry feels
4. formulas produce numeric spacing values in units of `U`
5. `themeSpacing()` converts the final number into a CSS length

## Size

`size` controls typography scale through `dataSize` and `themeSize()`.

Use it when the local subtree should inherit a larger or smaller text scale.

```ts
fontSize: (listener) => themeSize(listener, "inherit")
```

This is the part that defines the local `fontSize`, and therefore defines the local unit:

`U = fontSize / 4`

If the subtree font size changes, every formula built on `U` changes with it.

## Density

`density` controls compactness through `dataDensity` and `themeDensity()`.

Use it when the component should feel tighter or looser without changing the type scale.

Core variable:

- `d` = current density factor

Density factors come from the current theme:

`[0.75, 1, 1.5, 2, 2.5]`

Default density:

`d = 1.5`

Typical read:

```ts
const d = themeDensity(listener)
```

`themeDensity()` returns a number, not a CSS value. It is a multiplier used inside sizing formulas.

## Spacing

`spacing` is the final CSS length produced from the numeric result.

Use `themeSpacing(n)` after the geometry has already been decided.

```ts
gap: themeSpacing(3)
paddingInline: themeSpacing(themeDensity(listener) * 3)
```

So the role split is:

- `themeSize()` sets the scale
- `themeDensity()` sets the multiplier
- `themeSpacing()` emits the CSS value

## Geometry Variables

- `n` = intrinsic text lines
- `w` = wrapping level
- `d` = current density factor

## Wrapping Level

```txt
w = 0  inline / no boundary
w = 1  single-line bounded control
w = 2  multi-line bounded block
w = 3  structural section / large overlay
```

Examples:

| w | Class | Example |
| --- | --- | --- |
| 0 | inline / no boundary | text, icon, inline label |
| 1 | single-line bounded | button, input, select, tooltip |
| 2 | multi-line bounded | textarea, blockquote, card |
| 3 | structural section | dialog, drawer, fieldset |

## Geometry Formulas

Internal component geometry is formula-driven:

```txt
paddingBlock  = d * w * U
paddingInline = ceil(3 / w) * d * w * U   for w >= 1
paddingInline = 2dU                        for bounded inline w = 0
radius        = paddingBlock
height        = (n * 6 + 2 * d * w) * U
```

For single-line bounded controls (`n = 1`, `w = 1`):

```txt
height = (6 + 2d) * U
```

At default density `d = 1.5`, that becomes:

```txt
height = 9U
paddingBlock = 1.5U
paddingInline = 4.5U
radius = 1.5U
```

At `fontSize: 16px`:

```txt
height = 36px
paddingBlock = 6px
paddingInline = 18px
radius = 6px
```

## Industry Validation

The height formula produces the canonical button sizes used across major design systems — not by coincidence, but because those systems converged on the same proportions through practice.

At `fontSize: 16px` (`U = 4px`), `n = 1`, `w = 1`:

| Density `d` | Formula `(6 + 2d) * U` | Height | Matches |
| --- | --- | --- | --- |
| 0.75 | `(6 + 1.5) * 4` | **30px** | MUI small |
| 1 | `(6 + 2) * 4` | **32px** | Ant Design medium · Chakra small · GitHub medium |
| 1.5 | `(6 + 3) * 4` | **36px** | MUI medium |
| 2 | `(6 + 4) * 4` | **40px** | Ant Design large · Chakra medium · GitHub large |
| 2.5 | `(6 + 5) * 4` | **44px** | MUI large range |

These are not hardcoded sizes. They emerge from one formula across five density levels.

The formula does not prescribe what height a button must be. It reveals the underlying structure that the industry already arrived at through intuition and iteration.

## Putting Them Together

```ts
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme"

const button = {
  button: "Buy",
  dataDensity: "inherit",
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

This reads as:

- `themeSize(listener, "inherit")` -> local font size
- `themeDensity(listener)` -> current `d`
- `* 1` / `* 3` -> geometry factor for that edge
- `themeSpacing(...)` -> final CSS unit

## Reference Table

Base density `d = 1.5`:

| Level | w=0 | w=1 | w=2 | w=3 |
| --- | --- | --- | --- | --- |
| height (`n = 1`) | 6U | 9U | 12U | 15U |
| paddingBlock | 0 | 1.5U | 3U | 4.5U |
| paddingInline | 3U* | 4.5U | 6U | 4.5U |
| radius | 0 | 1.5U | 3U | 4.5U |

At `fontSize: 16px`:

| Level | w=0 | w=1 | w=2 | w=3 |
| --- | --- | --- | --- | --- |
| height (`n = 1`) | 24px | 36px | 48px | 60px |
| paddingBlock | 0 | 6px | 12px | 18px |
| paddingInline | 12px* | 18px | 24px | 18px |
| radius | 0 | 6px | 12px | 18px |

\* For `w = 0`, inline padding only applies to bounded inline surfaces such as `tag`, `badge`, or `code`. Pure text or icon inline content has no outer padding.

## Sub-Baseline Scale

Elements intentionally below the `6U` text baseline use the fixed proportional sub-scale:

`2U / 4U / 6U`

These stay fixed unless the patch explicitly defines another rule.

## Layout Spacing

Internal geometry is formula-driven. Layout spacing between separate regions is not.

Practical rule:

- horizontal `gap` / `margin-inline` should usually be at least the related `paddingInline`
- vertical `gap` / `margin-block` should usually be at least the related `paddingBlock`

Example at base density:

```ts
gap: themeSpacing(4.5) // >= w=1 paddingInline
gap: themeSpacing(3)   // >= w=2 paddingBlock
```

## Recommendation

Use `outline` or `box-shadow` instead of `border` when the sizing formula matters.

At `w = 1`, `d = 1.5`:

- formula height = `9U = 36px`
- a `1px` border on both sides adds `2px`
- total rendered height becomes `38px`

That is a `5.56%` deviation from the sizing model.

For the underlying tone model, see [Tone](./tone).
