---
title: "Spacing System"
description: "The themeSpacing scale, density multiplier, layout vs component spacing, and common patterns."
---

# Spacing System

## `themeSpacing(n)` — the base scale

`themeSpacing(n)` returns `n/4 em` (scales with font size — 4px steps at 16px base):

```ts
import { themeSpacing } from "@domphy/theme"

themeSpacing(1)   // "0.25em" = 4px at 16px base
themeSpacing(2)   // "0.5em"  = 8px
themeSpacing(3)   // "0.75em" = 12px
themeSpacing(4)   // "1em"    = 16px
themeSpacing(5)   // "1.25em" = 20px
themeSpacing(6)   // "1.5em"  = 24px
themeSpacing(8)   // "2em"    = 32px
themeSpacing(12)  // "3em"    = 48px
themeSpacing(16)  // "4em"    = 64px
```

Never hardcode spacing literals (`"16px"`, `"1.5rem"`) — `@domphy/doctor` flags those as `raw-spacing-value`.

## Density-aware spacing

For **bounded controls** (buttons, inputs, badges), multiply by `themeDensity(l)` so the component scales with the user's density preference:

```ts
import { themeSpacing, themeDensity } from "@domphy/theme"

const Button = {
  button: "Click me",
  style: {
    paddingBlock:  (l) => themeSpacing(themeDensity(l) * 1),  // 4px × density
    paddingInline: (l) => themeSpacing(themeDensity(l) * 3),  // 12px × density
    borderRadius:  (l) => themeSpacing(themeDensity(l) * 1),
  },
}
```

**Density scale** (`dataDensity`):

| Density | Multiplier | Typical use |
|---------|-----------|-------------|
| `decrease-4` | 0.75 | Ultra-compact (data grids) |
| `decrease-2` | 1.0 | Compact |
| `inherit` / `decrease-1` | 1.25 | Default |
| `increase-1` | 1.5 | Comfortable |
| `increase-2` | 2.0 | Touch targets |
| `increase-4` | 2.5 | Accessible large |

```ts
const CompactTable = {
  div: TableContent,
  dataDensity: "decrease-2",   // all descendants inherit compact density
}
```

## Layout vs component spacing

| Use | Rule |
|-----|------|
| **Component internal padding** (button, input, card) | `themeSpacing(density * n)` |
| **Gap between components in a layout** | `themeSpacing(n)` (no density) |
| **Section/page padding** | `themeSpacing(n)` (no density) |
| **Between tightly-related elements** | `themeSpacing(1–2)` |
| **Between loosely-related sections** | `themeSpacing(4–8)` |

The reason: density should affect UI chrome (button size, input height) but NOT the page's structural rhythm. If density affected both, a "compact" page would have a broken layout grid.

## Common spacing values

| Spacing | Value | Use |
|---------|-------|-----|
| `themeSpacing(0.5)` | 2px | Hairline gap between tightly stacked items |
| `themeSpacing(1)` | 4px | Icon-to-label gap, tight list gap |
| `themeSpacing(2)` | 8px | Internal button padding, small component gap |
| `themeSpacing(3)` | 12px | Medium gap, form label-to-input |
| `themeSpacing(4)` | 16px | Default content padding, card padding |
| `themeSpacing(6)` | 24px | Section padding, between cards |
| `themeSpacing(8)` | 32px | Between sections |
| `themeSpacing(12)` | 48px | Large section breaks |

## Using spacing in grid/flex layouts

```ts
const CardGrid = {
  div: (l) => cards.get(l).map((card) => ({ div: card.title, _key: card.id })),
  style: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: themeSpacing(4),   // 16px gap between cards
    padding: themeSpacing(6),   // 24px page padding
  },
}
```

## Padding shorthand

```ts
// All sides
padding: themeSpacing(4)

// Block and inline separately
paddingBlock: themeSpacing(2),
paddingInline: themeSpacing(4),

// Individual sides
paddingTop: themeSpacing(2),
paddingRight: themeSpacing(4),
paddingBottom: themeSpacing(2),
paddingLeft: themeSpacing(4),
```

Domphy's doctor watches these properties: `margin`, `padding`, `gap`, `rowGap`, `columnGap` and all their longhand variants.

## Border radius

Follow the bounded control pattern:

```ts
// Tight radius (small components)
borderRadius: (l) => themeSpacing(themeDensity(l) * 0.5),

// Medium radius (cards, modals)
borderRadius: themeSpacing(2),   // 8px (no density — structural, not control)

// Large radius (pills, chips)
borderRadius: "9999px",   // exception: fully-round is categorical, not a spacing value
```

## Spacing in scroll containers

```ts
const ScrollArea = {
  div: Content,
  style: {
    overflowY: "auto",
    padding: themeSpacing(4),
    // Prevent content from touching scrollbar
    paddingRight: themeSpacing(6),
  },
}
```

## inset shorthand

For overlays and sticky elements:

```ts
const Overlay = {
  div: null,
  style: {
    position: "fixed",
    inset: 0,   // shorthand for top/right/bottom/left: 0 (no spacing needed)
    background: "rgba(0,0,0,0.5)",
  },
}
```
