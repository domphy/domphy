---
title: "@domphy/blocks — API"
description: "The factory-function contract every @domphy/blocks export follows."
---

# API

## The factory-function contract

Every export in `@domphy/blocks` is a factory function, not a `$`-patch:

```ts
function name(props?: SomeProps): DomphyElement
```

- Call it directly to get a complete, mountable element tree: `const App = sidebar07()`.
- `props` is a single optional object with sane defaults — calling `name()` with zero arguments always renders a working demo (this is also what the visual-compare script screenshots).
- Only the genuinely variable parts are parameterized: data arrays (nav items, table rows, chart series, testimonial lists), primary text/labels, and key colors. Layout and structure stay a fixed literal tree, closer to a "copy-paste block" than a heavily configurable component — if you need something the props don't cover, copy the block's source out of `node_modules` and edit it directly, the same way you would with a shadcn block.

## Finding a block's own props

Each block's props type is exported alongside it (e.g. `HoverBorderGradientProps` next to `hoverBorderGradient`). The fastest way to see a block's full prop contract and inline documentation is to open its source file directly — every block lives under `packages/blocks/src/<source>/<category>/<name>.ts` in the repo, and the path is recorded in [`SOURCES.md`](https://github.com/domphy/domphy/blob/main/packages/blocks/SOURCES.md) / `registry.json`.

## Composing blocks

Some blocks reuse other blocks internally — `dashboard01`, for example, composes `sidebar07` (the icon-collapsible sidebar shell), a `@domphy/chart` recipe, and `@domphy/table`. There's nothing special about this: import the pieces you want and nest them like any other Domphy element tree.

## Self-check

Like the rest of Domphy, run `@domphy/doctor`'s `diagnose()`/`validate()` on any block you customize to catch non-idiomatic changes (raw colors, inline typography, tone/contrast issues) before shipping.
