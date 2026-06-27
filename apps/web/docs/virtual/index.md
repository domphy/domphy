<script setup lang="ts">
import Basic from "../demos/virtual/basic.ts?raw"
</script>

# Virtual

`@domphy/virtual` renders only the rows/columns currently in view — essential for long lists, grids, and tables — with dynamic measurement, overscan, sticky ranges, and smooth scroll-to.

Additional features beyond a standard virtualizer: iOS WebKit scroll deferral, `scrollBy`/`scrollToEnd`/`takeSnapshot` methods, lazy typed-array fast-path, and `laneAssignmentMode`/`useCachedMeasurements` options. Domphy-specific additions are documented here; the Domphy adapter lives in `src/domphy/`.

The core is framework-agnostic with zero dependencies.

## Install

::: code-group
```bash [NPM]
npm install @domphy/virtual @domphy/core
```
```html [CDN]
<script src="https://unpkg.com/@domphy/virtual/dist/virtual.global.js"></script>
```
:::

`@domphy/core` is a peer dependency of the adapter only.

## Live Example

10,000 rows; only the visible ones are mounted.

<CodeEditor :code="Basic" />

## Adapter

`createVirtualizer(options)` (from `@domphy/virtual/domphy`) owns the scroll element and binds the virtualizer to Domphy reactivity.

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: rows.length,
  estimateSize: () => 32,
  overscan: 10,
})
```

| Member | Description |
| --- | --- |
| `getVirtualItems(l)` | Reactive list of visible `VirtualItem`s — read with the listener inside the items function. |
| `getTotalSize(l)` | Reactive total scroll size, for the spacer height/width. |
| `setScrollElement(el)` | Wire the scroll container DOM node; call from its `_onMount`. |
| `measureElement(el)` | Dynamic measurement ref; call from each item's `_onMount` for variable sizes. |
| `scrollToIndex(i, opts?)` / `scrollToOffset(px, opts?)` | Imperative scrolling. |
| `setOptions(opts)` | Update `count`/options, then re-measure. |
| `virtualizer` | The underlying `Virtualizer` — the full virtual-core API. Includes Domphy additions not in upstream: `scrollBy(delta, opts?)`, `scrollToEnd(opts?)`, `takeSnapshot()`, `getDistanceFromEnd()`, `isAtEnd(threshold?)`. |
| `version(l)` | Raw reactive change counter. |
| `destroy()` | Detach observers; call from `_onRemove`. |

## Wiring

1. Make the outer element a fixed-height scroll container and wire it: `_onMount: (node) => list.setScrollElement(node.domElement)`. Add `_onRemove: () => list.destroy()` to detach observers when the container is removed.
2. Inside, render a relative spacer whose height is `list.getTotalSize(l)`.
3. Map `list.getVirtualItems(l)` into absolutely-positioned children using each item's `start`/`size`, keyed by `item.key`.
4. For variable-height rows, call `list.measureElement(node.domElement)` from each row's `_onMount` and drop the fixed `height`.

Pass your own `observeElementRect` / `observeElementOffset` / `scrollToFn` to virtualize against the window instead of an element.
