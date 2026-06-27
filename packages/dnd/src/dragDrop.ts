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
  return {
    _onMount: (node) => {
      const parent = node.domElement as HTMLElement | null;
      if (!parent) return;
      const plugins = animated
        ? [animations(), ...(rest.plugins ?? [])]
        : (rest.plugins ?? []);
      dragAndDrop<T>({
        parent,
        getValues: () => values.get(),
        setValues: (next) => values.set(next),
        config: { ...rest, plugins },
      });
    },
    _onRemove: (node) => {
      const parent = node.domElement as HTMLElement | null;
      if (parent) tearDown(parent);
    },
  };
}
