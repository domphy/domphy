import {
  observeWindowOffset,
  observeWindowRect,
  windowScroll,
} from "../index.js"
import {
  createVirtualizerWithDefaults,
  type CreateVirtualizerOptions,
  type VirtualizerHandle,
} from "./createVirtualizer.js"

/**
 * Options for `createWindowVirtualizer`. Identical to
 * `CreateVirtualizerOptions` with `TScroll` fixed to `Window`; the window
 * observers/scroll function are the defaults but may be overridden.
 */
export type CreateWindowVirtualizerOptions<TItem extends Element> =
  CreateVirtualizerOptions<Window, TItem>

/**
 * Typed convenience factory for window virtualization (the whole page
 * scrolls). Equivalent to `createVirtualizer` with `TScroll = Window` and the
 * `observeWindowRect`/`observeWindowOffset`/`windowScroll` defaults filled in
 * — no `as any` casts needed.
 *
 * Wire the scroll element from the container's `_onMount` exactly like the
 * element variant: `_onMount: () => handle.setScrollElement(window)`.
 * Construction touches no DOM globals, so the factory itself is SSR-safe.
 */
export function createWindowVirtualizer<TItem extends Element>(
  options: CreateWindowVirtualizerOptions<TItem>,
): VirtualizerHandle<Window, TItem> {
  return createVirtualizerWithDefaults(options, {
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: windowScroll,
  })
}
