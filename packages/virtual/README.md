# @domphy/virtual

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/virtual/) · [npm](https://www.npmjs.com/package/@domphy/virtual)

Headless list, grid, and window virtualization for Domphy apps: render only the rows/columns in view, with dynamic measurement, sticky ranges, and smooth scroll-to.

Like the rest of Domphy, the core is framework-agnostic with zero dependencies. The Domphy adapter lives in `src/domphy/`.

## Install

```bash
npm install @domphy/virtual @domphy/core
```

`@domphy/core` is a peer dependency of the adapter only; the main entry is dependency-free.

## Quick Example

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
import type { DomphyElement } from "@domphy/core"

const rows = Array.from({ length: 10000 }, (_, i) => `Row ${i}`)

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: rows.length,
  estimateSize: () => 32,
  overscan: 8,
})

const App: DomphyElement<"div"> = {
  // scroll container
  div: [
    {
      // total-size spacer; virtual items are absolutely positioned inside
      div: (l) =>
        list.getVirtualItems(l).map((item) => ({
          div: rows[item.index],
          style: {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: `${item.size}px`,
            transform: `translateY(${item.start}px)`,
          },
          _key: item.key,
          _onMount: (node) => list.measureElement(node.domElement),
        })),
      style: {
        position: "relative",
        height: (l) => `${list.getTotalSize(l)}px`,
        width: "100%",
      },
    },
  ],
  style: { height: "400px", overflow: "auto" },
  _onMount: (node) => list.setScrollElement(node.domElement as HTMLDivElement),
  _onRemove: () => list.destroy(),
}
```

## Adapter API

`createVirtualizer(options)` returns a handle:

| Member | Description |
| --- | --- |
| `getVirtualItems(l)` | Reactive list of visible `VirtualItem`s — read with the listener inside the items function. |
| `getTotalSize(l)` | Reactive total scroll size, for the spacer's height/width. |
| `setScrollElement(el)` | Wire the scroll container DOM node; call from its `_onMount`. |
| `measureElement(el)` | Dynamic measurement ref; call from each item's `_onMount`. |
| `scrollToIndex(index, opts?)` / `scrollToOffset(offset, opts?)` | Imperative scrolling. |
| `setOptions(opts)` | Update `count` and other options, then re-measure. |
| `virtualizer` | The underlying `Virtualizer` — the full virtual-core API. |
| `version(l)` | Raw reactive change counter. |
| `destroy()` | Detach observers; call from `_onRemove`. |

Options are the virtual-core `VirtualizerOptions` minus `getScrollElement` (the adapter owns it); `observeElementRect`, `observeElementOffset`, `scrollToFn`, and `onChange` default to the DOM implementations but can be overridden (e.g. for window virtualization).
