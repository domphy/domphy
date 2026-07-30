import { type Listener, State } from "@domphy/core"
import {
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type PartialKeys,
  type VirtualItem,
  Virtualizer,
  type VirtualizerOptions,
} from "../index.js"

declare const process:
  | { env: Record<string, string | undefined> }
  | undefined

// Dev-only warning guard, same pattern as @domphy/core's dev.ts — production
// bundlers fold this to `false` and tree-shake the guarded warning away.
const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production"

/**
 * Options for `createVirtualizer`. `getScrollElement` is dropped — the adapter
 * owns the scroll element (wired via `setScrollElement`); the DOM
 * `observeElementRect`/`observeElementOffset`/`elementScroll` and an `onChange`
 * that drives reactivity are filled in but may be overridden.
 */
export type CreateVirtualizerOptions<
  TScroll extends Element,
  TItem extends Element,
> = Omit<
  PartialKeys<
    VirtualizerOptions<TScroll, TItem>,
    | "observeElementRect"
    | "observeElementOffset"
    | "scrollToFn"
    | "onChange"
  >,
  "getScrollElement"
>

export interface VirtualizerHandle<
  TScroll extends Element,
  TItem extends Element,
> {
  virtualizer: Virtualizer<TScroll, TItem>
  /** Reactive list of visible items; re-renders as the user scrolls/resizes. */
  getVirtualItems(listener?: Listener): VirtualItem[]
  /** Reactive total scroll size of all items. */
  getTotalSize(listener?: Listener): number
  /** Raw reactive change counter (bumps on every virtualizer update). */
  version(listener?: Listener): number
  /** Wire the scroll container's DOM element — call from its `_onMount`. */
  setScrollElement(element: TScroll | null): void
  /** Dynamic item measurement — call from each item's `_onMount` with `node.domElement`. */
  measureElement(element: TItem | null): void
  scrollToIndex: Virtualizer<TScroll, TItem>["scrollToIndex"]
  scrollToOffset: Virtualizer<TScroll, TItem>["scrollToOffset"]
  /** Scroll by a relative pixel delta from the current offset. */
  scrollBy: Virtualizer<TScroll, TItem>["scrollBy"]
  /** Scroll to the last item (equivalent to scrollToIndex(count - 1, { align: "end" })). */
  scrollToEnd: Virtualizer<TScroll, TItem>["scrollToEnd"]
  /** Update options (e.g. `count`) and re-measure. */
  setOptions(options: Partial<VirtualizerOptions<TScroll, TItem>>): void
  destroy(): void
}

export function createVirtualizer<
  TScroll extends Element,
  TItem extends Element,
>(
  options: CreateVirtualizerOptions<TScroll, TItem>,
): VirtualizerHandle<TScroll, TItem> {
  const version = new State(0, "virtualVersion")
  let scrollElement: TScroll | null = null
  let cleanup: (() => void) | null = null
  let destroyed = false
  let destroyWarned = false

  const virtualizer = new Virtualizer<TScroll, TItem>({
    ...(options as VirtualizerOptions<TScroll, TItem>),
    getScrollElement: () => scrollElement,
    observeElementRect: options.observeElementRect ?? observeElementRect,
    observeElementOffset: options.observeElementOffset ?? observeElementOffset,
    scrollToFn: options.scrollToFn ?? elementScroll,
    onChange: (instance, sync) => {
      options.onChange?.(instance, sync)
      version.set(version.get() + 1)
    },
  })
  virtualizer._willUpdate()

  return {
    virtualizer,
    getVirtualItems: (listener) => {
      version.get(listener)
      return virtualizer.getVirtualItems()
    },
    getTotalSize: (listener) => {
      version.get(listener)
      return virtualizer.getTotalSize()
    },
    version: (listener) => version.get(listener),
    setScrollElement: (element) => {
      // After destroy() the handle is dead: re-mounting observers on it would
      // silently revive a disposed version State and leak listeners. Warn and
      // no-op instead — create a new virtualizer for a new mount.
      if (destroyed) {
        if (__DEV__ && !destroyWarned) {
          destroyWarned = true
          console.warn(
            "[@domphy/virtual] setScrollElement() called after destroy() — ignoring. " +
              "Create a new virtualizer instead of reviving a destroyed handle.",
          )
        }
        return
      }
      if (scrollElement === element) return
      scrollElement = element
      cleanup?.()
      cleanup = element ? virtualizer._didMount() : null
      virtualizer._willUpdate()
      virtualizer.measure()
    },
    measureElement: (element) => virtualizer.measureElement(element),
    // Bound defensively: the handle contract is that these are safe to
    // destructure (`const { scrollToIndex } = handle`). They are arrow
    // properties on the vendored Virtualizer today; the bind keeps that
    // contract intact even if the port ever becomes prototype methods.
    scrollToIndex: virtualizer.scrollToIndex.bind(virtualizer),
    scrollToOffset: virtualizer.scrollToOffset.bind(virtualizer),
    scrollBy: virtualizer.scrollBy.bind(virtualizer),
    scrollToEnd: virtualizer.scrollToEnd.bind(virtualizer),
    setOptions: (next) => {
      virtualizer.setOptions({ ...virtualizer.options, ...next })
      virtualizer._willUpdate()
      virtualizer.measure()
    },
    destroy: () => {
      destroyed = true
      cleanup?.()
      cleanup = null
      // Drop the element reference too — otherwise the disposed handle keeps
      // the (possibly detached) DOM subtree reachable.
      scrollElement = null
      version._dispose()
    },
  }
}
