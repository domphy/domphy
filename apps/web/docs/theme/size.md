# Size

Domphy sizing is based on one unit:

`U = fontSize / 4`

At `fontSize: 16px`, `U = 4px`.

Use:

- `themeSize(listener, key)` to resolve font size from `dataSize`
- `themeDensity(listener)` to resolve the current density factor from `dataDensity`
- `themeSpacing(n)` to convert the final numeric result into CSS units

## Core Variables

- `n` = intrinsic text lines
- `w` = wrapping level
- `d` = current density factor

Density factors come from the current theme:

`[0.75, 1, 1.5, 2, 2.5]`

Default density:

`d = 1.5`

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

## Formulas

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

## Example

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
    color: (listener) => themeColor(listener, "shift-6", "primary"),
  },
}
```

This reads as:

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

\* For `w = 0`, inline padding only applies to bounded inline surfaces such as `tag`, `badge`, or `code`. Pure text/icon inline content has no outer padding.

## Sub-Baseline Scale

Elements intentionally below the `6U` text baseline use the fixed proportional sub-scale:

`2U / 4U / 6U`

These stay fixed unless the patch explicitly defines another rule.

## Recommendation

Use `outline` or `box-shadow` instead of `border` when the sizing formula matters.

At `w = 1`, `d = 1.5`:

- formula height = `9U = 36px`
- a `1px` border on both sides adds `2px`
- total rendered height becomes `38px`

That is a `5.56%` deviation from the sizing model.

## Spacing Between Elements

Internal geometry is formula-driven. Layout spacing between separate regions is not.

Practical rule:

- horizontal `gap` / `margin-inline` should usually be at least the related `paddingInline`
- vertical `gap` / `margin-block` should usually be at least the related `paddingBlock`

Example at base density:

```ts
gap: themeSpacing(4.5) // >= w=1 paddingInline
gap: themeSpacing(3)   // >= w=2 paddingBlock
```

For the underlying tone model, see [Tone](./tone).
