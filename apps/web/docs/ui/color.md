# Color And Tone

Practical reference for `@domphy/ui`, based on `@domphy/theme`.

- tone ramp: `18` steps
- contrast span: `K = 9`

For theory, see [Theme Tone](/docs/theme/tone).

## dataTone

`dataTone` is the default background tone context for a surface.

If a container sets `dataTone`, child elements that use `themeColor(listener, "inherit", family)` will resolve their background from that tone context first.

Use `dataTone` to choose the default surface branch before styling individual `backgroundColor` values.

| Case | Tone |
| --- | --- |
| Default | `inherit` |
| Near Default | `shift-1`, `shift-2` |
| Base | `base`, `shift-7`, `shift-8`, `shift-9` |
| Invert | `shift-17`, `shift-16`, `shift-15` |

Notes:

- if the tone is `inherit`, do not set `dataTone`; it already inherits by default and keeps the current surface context.
- `shift-1` and `shift-2` are explicit near-default surfaces, not the default itself.
- `base` means the configured base tone of the chosen color family in `@domphy/theme`; it is not a fixed number.
- overlay surfaces use the `Invert` branch.
- in the current built-in light theme, `primary` commonly reads near the middle accent band.
- in UI usage, `base` is mainly useful when you want the theme's authored default emphasis instead of hard-coding a `shift-N`.

## Background Color

### Static State

| Case | Tone | Description |
| --- | --- | --- |
| Default | `inherit` | normal background; default family is `neutral` |
| Indicator | `shift-3` | current menu item, current option, progress track, switch track, current indicator |
| Selected | `shift-6` | selected fill; default accent family is `primary` |

## Boundary Edge

This section applies to any visual edge:

- `border`
- `outline`
- `boxShadow`
- any other style used as a boundary edge

### Static State

| Case | Tone | Description |
| --- | --- | --- |
| Separator | `shift-3` | divider, separator, table line, passive boundary |
| Control Edge | `shift-4` | input outline, card border, select border, bounded control edge |
| Strong Edge | `shift-6` | focus ring, current item edge, selected tab edge, selected option edge |

Note:

- use boundary edge static state when the state is expressed by the edge itself
- if the background already carries the selected state, do not also force a selected edge unless stronger emphasis is needed

## Text Color

### Semantic

| Case | Tone | Description |
| --- | --- | --- |
| Default | `shift-9` | body text, label text, and normal control text |
| Emphasis 1 | `shift-10` | emphasized text such as filled field text, stronger labels, and alert text |
| Emphasis 2 | `shift-11` | highest semantic emphasis on a normal surface, such as strong headings or high-emphasis labels |
| Secondary | `shift-8` | helper text, secondary text, dimmed text, and lower-priority supporting text |
| Secondary 2 | `shift-7` | placeholder text and the weakest supporting text |

### Static State

| Case | Tone | Description |
| --- | --- | --- |
| Indicator | `shift-10` | current menu item, current option, current indicator text |
| Selected | `shift-11` | selected text on the strongest static state |

Note:

- use text static state when the text itself must show the static state more clearly
- text static state can appear together with background or boundary edge static state when stronger text emphasis is needed

## Interaction State

Interaction state is not a separate base state.

It is a delta applied on top of the current static state.

| Case | Delta | Description |
| --- | --- | --- |
| Hover | `+1` or `-1` | move one level from the current static state |
| Active | `+2` or `-2` | move two levels from the current static state |

Notes:

- choose only one role to carry the interaction state, not all three at the same time
- priority order is: background, then boundary edge, then text
- use text interaction only when background and boundary edge interaction are both absent
- static states stay `3` levels apart, while interaction changes by at most `1` or `2` levels, so hover and active do not collide with adjacent static states

## Focus Visible

Use `Focus Visible` as a separate focus rule.

| Case | Use | Description |
| --- | --- | --- |
| Existing focus edge | reuse `Boundary Edge -> Strong Edge` | if the focused object already has a dedicated focus edge, use that same edge for focus |
| No existing focus edge | `outline` + `outlineOffset: themeSpacing(1)` + `Strong Edge` | if the focused object does not already have a dedicated focus edge, create focus with `outline` and offset |

Notes:

- if `Strong Edge` is already used for selected or current state, do not rely on that alone for focus; add a separate focus outline

Example:

```ts
"&:focus-visible": {
  outline: (listener) => `1px solid ${themeColor(listener, "shift-6", "primary")}`,
  outlineOffset: themeSpacing(1),
}
```

## Disabled

Disabled is handled as de-emphasis, not as a core tone state.

| Part | Default | Optional |
| --- | --- | --- |
| Background | lower `opacity` | `shift-2` with `neutral` |
| Text | lower `opacity` | `shift-8` with `neutral` |

Notes:

- use opacity first
- tone change is optional when opacity alone is not enough
- optional tone changes bring background and text closer together instead of keeping the normal `9`-step contrast distance

## Color Family

| Name | Description |
| --- | --- |
| `neutral` | default UI family for surfaces, text, boundaries, and low-semantic controls |
| `primary` | main accent family in the current light theme; use it for accent UI, selected state, and focus emphasis |
| `secondary` | alternate accent family when emphasis should not use the primary branch |
| `info` | informational family for informative state, hint, and non-critical notice UI |
| `success` | positive family for success state, confirmed action, and completed status UI |
| `warning` | caution family for warning state and attention UI that is not destructive |
| `error` | error family for invalid input, error state, and failure feedback UI |
| `danger` | destructive family for destructive action and high-risk UI such as delete or remove |
| `highlight` | highlight family for marked content, highlighted region, and featured emphasis |

## Patch Reference

This table groups patches by the `dataTone` they set themselves.

| dataTone | Patches |
| --- | --- |
| `inherit` | `breadcrumb`, `button`, `card`, `combobox`, `commandSearch`, `commandItem`, `details`, `dialog`, `drawer`, `formGroup`, `inputDateTime`, `inputFile`, `inputNumber`, `inputSearch`, `inputText`, `keyboard`, `menuItem`, `pagination`, `select`, `selectBox`, `selectItem`, `tab`, `textarea`, `toggle` |
| `shift-2` | `alert`, `avatar`, `blockquote`, `buttonSwitch`, `code`, `image`, `inputSwitch`, `mark`, `preformated`, `skeleton`, `tag`, `toggleGroup` |
| `shift-17` | `menu`, `popover`, `selectList`, `toast`, `tooltip` |

## Core Pattern

```ts
backgroundColor: (listener) => themeColor(listener, "inherit", "neutral")
color: (listener) => themeColor(listener, "shift-9", "neutral")
outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`
```
