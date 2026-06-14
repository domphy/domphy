import { type Listener, State } from "@domphy/core"
import { createTable } from "../core/table.js"
import type {
  RowData,
  Table,
  TableOptions,
  TableOptionsResolved,
  TableState,
  Updater,
} from "../types.js"

/**
 * Reactive wrapper around table-core. table-core is headless and controlled:
 * it reports state changes through `onStateChange` and expects the controlled
 * state fed back via `setOptions`. This wires that loop and bumps a Domphy
 * `version` state on every change, so a subtree that reads `version(l)` first
 * re-renders whenever sorting/filtering/pagination/selection change. The full
 * table-core API stays available on `.table`.
 */
export interface DomphyTable<TData extends RowData> {
  table: Table<TData>
  /** Subscribe `listener`; the counter bumps on every table state change. */
  version(listener?: Listener): number
  /** Current full table state, reactive when a listener is passed. */
  state(listener?: Listener): TableState
  setState(updater: Updater<TableState>): void
  destroy(): void
}

export function createDomphyTable<TData extends RowData>(
  options: TableOptions<TData>,
): DomphyTable<TData> {
  const version = new State(0, "tableVersion")

  const table = createTable<TData>({
    ...options,
    state: { ...options.initialState, ...options.state },
    onStateChange: (updater) => {
      const next =
        typeof updater === "function"
          ? (updater as (old: TableState) => TableState)(table.getState())
          : updater
      table.setOptions((prev) => ({ ...prev, state: next }))
      options.onStateChange?.(updater)
      version.set(version.get() + 1)
    },
    renderFallbackValue: options.renderFallbackValue ?? null,
  } as TableOptionsResolved<TData>)

  return {
    table,
    version: (listener) => version.get(listener),
    state: (listener) => {
      version.get(listener)
      return table.getState()
    },
    setState: (updater) => table.setState(updater),
    destroy: () => version._dispose(),
  }
}
