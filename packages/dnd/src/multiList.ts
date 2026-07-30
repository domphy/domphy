import type { PartialElement, State } from "@domphy/core";
import { behavior } from "@domphy/core";
import {
  attachDragDrop,
  type DragDropBehaviorProps,
  type DragDropConfig,
} from "./dragDrop.js";

export interface MultiListOptions<T> {
  /** Shared group name — lists sharing the same group can exchange items. */
  group: string;
  /** State for this list. */
  values: State<T[]>;
  /** Config overrides for this specific list. */
  config?: DragDropConfig<T>;
}

// Shared frozen default — see dragDrop.ts for why a fresh `{}` per factory
// call would force a pointless re-registration on every parent re-render.
const DEFAULT_CONFIG = Object.freeze({}) as DragDropConfig<any>;

/**
 * Enables cross-list drag-and-drop for multiple lists sharing a group.
 *
 * All lists in the same group can receive items from each other. Reordering
 * within each list and transferring between lists both update the respective
 * State arrays.
 *
 * The FormKit registration lives in the same per-node `behavior()` instance
 * as `dragDrop()` — a factory re-run on a reused node routes the new
 * `values`/`group`/`config` into the live instance instead of being dropped.
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
  const { group, values, config = DEFAULT_CONFIG } = options;
  return behavior<DragDropBehaviorProps<T>>("domphy:dnd", attachDragDrop, {
    values,
    config,
    group,
  });
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
