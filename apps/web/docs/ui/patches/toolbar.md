---
title: toolbar
---

# toolbar

A horizontal flex row with vertically centered items. Useful for headers, toolbars, navigation bars, and action strips. Gap scales with density context.

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
| `gap` | `number` | `4` | Spacing multiplier for gap. `4` = `1em`, scales with `themeDensity`. |

## toolbarSpacer

A companion element — a `<div>` with `flex: 1 1 0` — that expands to fill available space, pushing subsequent siblings to the far end.

```ts
// Logo left, nav+actions right
{ header: [logo, toolbarSpacer(), nav, actions], $: [toolbar()] }
```
