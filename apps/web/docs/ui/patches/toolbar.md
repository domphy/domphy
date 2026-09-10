---
title: toolbar
---

# toolbar

A horizontal flex row with vertically centered items. Useful for headers, toolbars, navigation bars, and action strips. A semantic alias of `row()` — wrap/justify/align/density are forwarded so callers do not drop down to hand-rolled flex.

## Usage

```ts
import { toolbar, toolbarSpacer } from "@domphy/ui"

const Header = {
  header: [
    { a: "Acme", href: "/", style: { fontWeight: 700 } },
    toolbarSpacer(),
    { nav: [{ a: "Docs", href: "/docs" }, { a: "Pricing", href: "/pricing" }], $: [toolbar({ gap: 4 })] },
    { button: "Sign in", type: "button" },
  ],
  $: [toolbar({ gap: 4 })],
  style: { padding: "0 24px", height: "56px", borderBottom: "1px solid #eee" },
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `number` | `4` | Spacing multiplier for gap between items. With `density: true` (default): `themeSpacing(density × gap)` — at default density (1.5), `gap 4` = `1.5em`. With `density: false`: bare `themeSpacing(gap)` — `gap 4` = `1em`. |
| `wrap` | `boolean` | `false` | Allow items to wrap onto multiple lines (`flexWrap: "wrap"`). |
| `justify` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | unset | Main-axis distribution (`justifyContent`). Left unset by default (flex's own default, `flex-start`). |
| `align` | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "baseline"` | `"center"` | Cross-axis alignment (`alignItems`). |
| `density` | `boolean` | `true` | When `true`, gap is multiplied by theme density (bounded-control mode). When `false`, gap is structural `themeSpacing(n)` with no density multiply. |

## toolbarSpacer

A companion element — a `<div>` with `flex: 1 1 0` — that expands to fill available space, pushing subsequent siblings to the far end.

```ts
// Logo left, nav+actions right
{ header: [logo, toolbarSpacer(), nav, actions], $: [toolbar()] }
```
