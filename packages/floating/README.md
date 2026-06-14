# @domphy/floating

Anchor positioning for tooltips, popovers, dropdowns, and menus — `computePosition`, `autoUpdate`, and the `offset` / `flip` / `shift` / `arrow` / `size` middleware.

This package is a **1-1 vendor of [floating-ui](https://github.com/floating-ui/floating-ui)** (`@floating-ui/dom` + `@floating-ui/core` + `@floating-ui/utils`, MIT © Floating UI contributors), bundled into a single **zero-dependency** package. The source is kept byte-identical to upstream (cross-package imports are resolved at build time), so the entire [Floating UI reference](https://floating-ui.com) applies as-is. It exists so `@domphy/ui` has **no external runtime dependency** — Domphy's overlay patches (`tooltip`, `popover`, `selectBox`, `combobox`) use it internally.

## Install

```bash
npm install @domphy/floating
```

Zero dependencies. Same API surface as `@floating-ui/dom`.

## Usage

```ts
import { computePosition, autoUpdate, offset, flip, shift } from "@domphy/floating"

const cleanup = autoUpdate(referenceEl, floatingEl, async () => {
  const { x, y } = await computePosition(referenceEl, floatingEl, {
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  })
  Object.assign(floatingEl.style, { left: `${x}px`, top: `${y}px` })
})
// later: cleanup()
```

See [floating-ui.com](https://floating-ui.com) for the full middleware and platform API — it is identical.
