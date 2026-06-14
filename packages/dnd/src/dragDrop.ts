import type { PartialElement, State } from "@domphy/core";
import {
  dragAndDrop,
  type ParentConfig,
  tearDown,
} from "@formkit/drag-and-drop";

/**
 * Domphy adapter for `@formkit/drag-and-drop`. Apply to the list container via
 * `$`; it wires FormKit's drag engine to a Domphy `State<T[]>` — reorders update
 * the state and the keyed children re-render. The same pattern the React/Vue/
 * Solid adapters use. Render the children reactively from the same state with a
 * stable `_key` per item.
 *
 * ```ts
 * const items = toState([{ id: 1, label: "A" }, { id: 2, label: "B" }])
 * const App = {
 *   ul: (l) => items.get(l).map((it) => ({ li: it.label, _key: it.id })),
 *   $: [dragDrop(items)],
 * }
 * ```
 */
export function dragDrop<T>(
  values: State<T[]>,
  config: Partial<ParentConfig<T>> = {},
): PartialElement {
  return {
    _onMount: (node) => {
      const parent = node.domElement as HTMLElement | null;
      if (!parent) return;
      dragAndDrop<T>({
        parent,
        getValues: () => values.get(),
        setValues: (next) => values.set(next),
        config,
      });
    },
    _onRemove: (node) => {
      const parent = node.domElement as HTMLElement | null;
      if (parent) tearDown(parent);
    },
  };
}
