import type { PartialElement, State } from "@domphy/core";
import { animations, dragAndDrop, tearDown } from "@formkit/drag-and-drop";
import type { DragDropConfig } from "./dragDrop.js";

export interface MultiListOptions<T> {
  /** Shared group name — lists sharing the same group can exchange items. */
  group: string;
  /** State for this list. */
  values: State<T[]>;
  /** Config overrides for this specific list. */
  config?: DragDropConfig<T>;
}

/**
 * Enables cross-list drag-and-drop for multiple lists sharing a group.
 *
 * All lists in the same group can receive items from each other. Reordering
 * within each list and transferring between lists both update the respective
 * State arrays.
 *
 * ```ts
 * const todo = toState(["Write tests", "Review PR"])
 * const done = toState(["Deploy", "Merge"])
 *
 * const App = {
 *   div: [
 *     {
 *       ul: (l) => todo.get(l).map((t) => ({ li: t, _key: t })),
 *       $: [multiList({ group: "tasks", values: todo })],
 *     },
 *     {
 *       ul: (l) => done.get(l).map((t) => ({ li: t, _key: t })),
 *       $: [multiList({ group: "tasks", values: done })],
 *     },
 *   ],
 * }
 * ```
 */
export function multiList<T>(options: MultiListOptions<T>): PartialElement {
  const { group, values, config = {} } = options;
  const { animated = true, ...rest } = config;
  // See dragDrop.ts for why the setup below is deferred by a double rAF and
  // guarded by this flag: Domphy fires _onMount before appending children,
  // and an immediate remove() in the same paint cycle must cancel the
  // deferred dragAndDrop() registration instead of leaking it.
  let disposed = false;
  return {
    _onMount: (node) => {
      const parent = node.domElement as HTMLElement | null;
      if (!parent) return;
      const plugins = animated
        ? [animations(), ...(rest.plugins ?? [])]
        : (rest.plugins ?? []);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (disposed) return;
          const setValues = (next: T[]) => values.set(next);
          dragAndDrop<T>({
            parent,
            getValues: () => values.get(),
            setValues,
            config: { ...rest, group, plugins },
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

/**
 * Wires multiple lists to a shared drag group in one call.
 * Returns an array of PartialElements — zip with your list containers.
 *
 * ```ts
 * const [dropA, dropB] = multiListGroup("tasks", [listA, listB])
 *
 * const App = {
 *   div: [
 *     { ul: ..., $: [dropA] },
 *     { ul: ..., $: [dropB] },
 *   ],
 * }
 * ```
 */
export function multiListGroup<T>(
  group: string,
  lists: State<T[]>[],
  config: DragDropConfig<T> = {},
): PartialElement[] {
  return lists.map((values) => multiList({ group, values, config }));
}
