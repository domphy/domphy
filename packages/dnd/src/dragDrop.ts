import type { PartialElement, State } from "@domphy/core";
import {
  animations,
  dragAndDrop,
  type ParentConfig,
  tearDown,
} from "@formkit/drag-and-drop";

export interface DragDropConfig<T> extends Partial<ParentConfig<T>> {
  /** Enable sort animations. Default: true. */
  animated?: boolean;
}

/**
 * Domphy adapter for `@formkit/drag-and-drop`. Apply to the list container via
 * `$`; it wires FormKit's drag engine to a Domphy `State<T[]>` — reorders update
 * the state and the keyed children re-render.
 *
 * Animations are enabled by default. Pass `animated: false` to disable.
 *
 * ```ts
 * const items = toState([{ id: 1, label: "A" }, { id: 2, label: "B" }])
 * const App = {
 *   ul: (l) => items.get(l).map((it) => ({ li: it.label, _key: it.id })),
 *   $: [dragDrop(items)],
 * }
 * ```
 *
 * With a drag handle:
 * ```ts
 * dragDrop(items, { dragHandle: ".drag-handle" })
 * ```
 *
 * Cross-list transfer with a named group:
 * ```ts
 * dragDrop(listA, { group: "shared" })
 * dragDrop(listB, { group: "shared" })
 * ```
 */
export function dragDrop<T>(
  values: State<T[]>,
  config: DragDropConfig<T> = {},
): PartialElement {
  const { animated = true, ...rest } = config;
  // The double-rAF setup below is deferred past _onRemove if mount+remove
  // happen inside the same paint cycle; without this flag the rAF callback
  // would register dragAndDrop() (parents map, MutationObserver, listeners)
  // on an already-torn-down (or never torn down, since tearDown() was a
  // no-op) parent element, leaking them permanently.
  let disposed = false;
  return {
    _onMount: (node) => {
      const parent = node.domElement as HTMLElement | null;
      if (!parent) return;
      const plugins = animated
        ? [animations(), ...(rest.plugins ?? [])]
        : (rest.plugins ?? []);
      // Domphy renders children AFTER firing _onMount, so dragAndDrop() would see
      // 0 DOM children at init time. Double-rAF defers until after paint.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (disposed) return;
          const setValues = (next: T[]) => values.set(next);
          dragAndDrop<T>({
            parent,
            getValues: () => values.get(),
            setValues,
            config: { ...rest, plugins },
          });
        }),
      );
    },
    _onRemove: (node) => {
      disposed = true;
      const parent = node.domElement as HTMLElement | null;
      if (parent) tearDown(parent);
    },
  };
}
