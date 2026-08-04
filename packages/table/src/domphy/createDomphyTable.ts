import { type Listener, State } from "@domphy/core"
import { createTable } from "../core/table.js"
import type {
  Column,
  HeaderGroup,
  RowData,
  RowModel,
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
 *
 * ### `options.onStateChange` contract — differs from TanStack React
 *
 * The adapter APPLIES every state change itself (feeds the new state back via
 * `setOptions`) and only THEN invokes your `options.onStateChange` with the
 * raw updater — purely as a notification. This is deliberately unlike the
 * TanStack React adapter contract, where `onStateChange` is where YOU apply
 * the updater to your own state (e.g. `setState`) and feed it back through
 * `options.state`. Here the state lives inside the adapter: do NOT apply the
 * updater a second time and do NOT pass `options.state` expecting controlled
 * round-trips to work the React way — use the handler for side effects only
 * (persistence, URL sync, analytics).
 *
 * Convenience read methods (getRowModel, getHeaderGroups, getAllLeafColumns,
 * etc.) accept an optional `Listener` and subscribe to the version counter
 * internally, so you can pass the listener directly instead of calling
 * `version(l)` at the top of your render function.
 */
export interface DomphyTable<TData extends RowData> {
  /** The raw table-core `Table` instance — every feature method lives here. */
  table: Table<TData>

  /** Subscribe `listener`; the counter bumps on every table state change. */
  version(listener?: Listener): number

  /** Current full table state, reactive when a listener is passed. */
  state(listener?: Listener): TableState

  setState(updater: Updater<TableState>): void

  /**
   * Feeds new options into the table (new `data`, new `columns`, changed
   * feature callbacks, …) and bumps the version counter so reactive readers
   * re-render. The row models re-derive automatically on a `data` identity
   * change (including `autoResetPageIndex` page-index clamping on data
   * shrink). Do NOT use this for `state` or `onStateChange` — state updates
   * go through `setState`, and `onStateChange` is owned by the adapter.
   */
  setOptions(
    updater: Updater<TableOptionsResolved<TData>>,
  ): void

  /** Releases the version state's listeners. Call from `_onRemove`. */
  destroy(): void

  // ---------------------------------------------------------------------------
  // Reactive convenience reads — each subscribes via version when a listener
  // is provided, so you can skip the explicit `version(l)` preamble.
  // ---------------------------------------------------------------------------

  /** Rows after all active row models (sort, filter, pagination, grouping). */
  getRowModel(listener?: Listener): RowModel<TData>

  /** Header groups for rendering `<thead>`. */
  getHeaderGroups(listener?: Listener): HeaderGroup<TData>[]

  /** All leaf columns regardless of visibility. */
  getAllLeafColumns(listener?: Listener): Column<TData, unknown>[]

  /** Visible leaf columns only (respects `columnVisibility` state). */
  getVisibleLeafColumns(listener?: Listener): Column<TData, unknown>[]

  /** `true` when every leaf column is visible. */
  getIsAllColumnsVisible(listener?: Listener): boolean

  /** `true` when at least one leaf column is visible. */
  getIsSomeColumnsVisible(listener?: Listener): boolean

  /**
   * The currently-selected rows as a row model.
   * Requires `enableRowSelection: true` in options.
   */
  getSelectedRowModel(listener?: Listener): RowModel<TData>

  /**
   * `true` when all filtered rows are selected.
   * Requires `enableRowSelection: true` in options.
   */
  getIsAllRowsSelected(listener?: Listener): boolean

  /**
   * `true` when some (but not all) filtered rows are selected.
   * Requires `enableRowSelection: true` in options.
   */
  getIsSomeRowsSelected(listener?: Listener): boolean

  /**
   * `true` when all rows with sub-rows are expanded.
   * Requires `getExpandedRowModel()` in options.
   */
  getIsAllRowsExpanded(listener?: Listener): boolean

  /**
   * `true` when a next page exists.
   * Requires `getPaginationRowModel()` in options.
   */
  getCanNextPage(listener?: Listener): boolean

  /**
   * `true` when a previous page exists.
   * Requires `getPaginationRowModel()` in options.
   */
  getCanPreviousPage(listener?: Listener): boolean

  /**
   * Total number of pages after filtering.
   * Returns -1 when `rowCount` is not known.
   * Requires `getPaginationRowModel()` in options.
   */
  getPageCount(listener?: Listener): number
}

export function createDomphyTable<TData extends RowData>(
  options: TableOptions<TData>,
): DomphyTable<TData> {
  const version = new State(0, "tableVersion")
  // Set by destroy(): suppresses any further version writes so a table that
  // outlives its binding never writes to a disposed state (DEV warns).
  let destroyed = false

  const table = createTable<TData>({
    ...options,
    state: { ...options.initialState, ...options.state },
    onStateChange: (updater) => {
      const previousState = table.getState()
      const next =
        typeof updater === "function"
          ? (updater as (old: TableState) => TableState)(previousState)
          : updater
      // Apply first, then notify: the user's handler is a notification only
      // (see the contract note on the interface above) and fires even for
      // no-op updates, matching table-core's unconditional onStateChange.
      if (next !== previousState) {
        table.setOptions((prev) => ({ ...prev, state: next }))
      }
      options.onStateChange?.(updater)
      // No-op update (the updater returned the state unchanged): skip the
      // version bump — otherwise renders re-run for changes that never
      // happened. Post-destroy the version state is disposed; skip the write.
      if (next === previousState || destroyed) return
      version.set(version.get() + 1)
    },
    renderFallbackValue: options.renderFallbackValue ?? null,
  } as TableOptionsResolved<TData>)

  // `table.initialState` contains defaults seeded by every feature's
  // `getInitialState` (e.g. `rowSelection: {}`, `expanded: {}`, …). Merge
  // them under the user-controlled state so unspecified slices are always
  // defined and feature methods never receive `undefined`.
  table.setOptions((prev) => ({
    ...prev,
    state: { ...table.initialState, ...prev.state },
  }))

  /** Read version (subscribing when listener is provided) then return result. */
  function read<T>(listener: Listener | undefined, fn: () => T): T {
    version.get(listener)
    return fn()
  }

  return {
    table,
    version: (listener) => version.get(listener),
    state: (listener) => read(listener, () => table.getState()),
    setState: (updater) => table.setState(updater),
    setOptions: (updater) => {
      // Resolve the updater here (table-core's setOptions always merges into
      // a fresh object, so post-hoc identity can't detect a no-op): an
      // identity-returning updater changes nothing — skip apply + bump.
      const next =
        typeof updater === "function"
          ? (updater as (old: TableOptionsResolved<TData>) => TableOptionsResolved<TData>)(
              table.options,
            )
          : updater
      if (next === table.options) return
      table.setOptions(() => next)
      // Post-destroy the version state is disposed; skip the write.
      if (destroyed) return
      version.set(version.get() + 1)
    },
    destroy: () => {
      destroyed = true
      version._dispose()
    },

    getRowModel: (listener) => read(listener, () => table.getRowModel()),
    getHeaderGroups: (listener) => read(listener, () => table.getHeaderGroups()),
    getAllLeafColumns: (listener) => read(listener, () => table.getAllLeafColumns()),
    getVisibleLeafColumns: (listener) =>
      read(listener, () => table.getVisibleLeafColumns()),
    getIsAllColumnsVisible: (listener) =>
      read(listener, () => table.getIsAllColumnsVisible()),
    getIsSomeColumnsVisible: (listener) =>
      read(listener, () => table.getIsSomeColumnsVisible()),
    getSelectedRowModel: (listener) =>
      read(listener, () => table.getSelectedRowModel()),
    getIsAllRowsSelected: (listener) =>
      read(listener, () => table.getIsAllRowsSelected()),
    getIsSomeRowsSelected: (listener) =>
      read(listener, () => table.getIsSomeRowsSelected()),
    getIsAllRowsExpanded: (listener) =>
      read(listener, () => table.getIsAllRowsExpanded()),
    getCanNextPage: (listener) => read(listener, () => table.getCanNextPage()),
    getCanPreviousPage: (listener) =>
      read(listener, () => table.getCanPreviousPage()),
    getPageCount: (listener) => read(listener, () => table.getPageCount()),
  }
}
