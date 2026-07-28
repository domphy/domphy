import {
  Cell,
  Column,
  OnChangeFn,
  Row,
  RowData,
  Table,
  TableFeature,
  Updater,
} from '../types'
import { makeStateUpdater } from '../utils'

// Domphy-original feature (no TanStack table-core counterpart). Opt-in only:
// it is NOT part of the built-in feature list — pass it via
// `options._features: [CellEditing]`.

export interface EditingCellId {
  rowId: string
  columnId: string
}

export type CellEditingState = EditingCellId | null

export interface CellEditingTableState {
  cellEditing: CellEditingState
}

export interface CellEdit<TData extends RowData> {
  rowId: string
  columnId: string
  value: unknown
  cell: Cell<TData, unknown>
}

export interface CellEditingOptions<TData extends RowData> {
  /**
   * - Enables/disables cell editing for all cells in the table OR
   * - A function that given a cell, returns whether to enable/disable editing for that cell
   */
  enableCellEditing?: boolean | ((cell: Cell<TData, unknown>) => boolean)
  /**
   * If provided, this function will be called with an `updaterFn` when `state.cellEditing` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
   */
  onCellEditingChange?: OnChangeFn<CellEditingState>
  /**
   * Called when a cell commits an edit. This is the hook where the caller writes the edited value back into their own data — the table itself never mutates `options.data`.
   */
  onCellEdit?: (edit: CellEdit<TData>) => void
}

export interface CellEditingCell {
  /**
   * Enters edit mode for the cell if `getCanEdit()` returns `true`. Only one cell can be editing at a time — beginning an edit on another cell moves the editing state.
   */
  beginEdit: () => void
  /**
   * Exits edit mode without firing `options.onCellEdit`.
   */
  cancelEdit: () => void
  /**
   * Fires `options.onCellEdit` with the cell's `rowId`/`columnId` and the committed value, then exits edit mode.
   */
  commitEdit: (value: unknown) => void
  /**
   * Returns whether or not the cell can be edited, resolved from the `enableCellEditing` option.
   */
  getCanEdit: () => boolean
  /**
   * Returns whether or not the cell is currently in edit mode.
   */
  getIsEditing: () => boolean
}

export interface CellEditingInstance<TData extends RowData> {
  /**
   * Returns the cell currently in edit mode, or `null` when no cell is editing.
   */
  getEditingCell: () => EditingCellId | null
  /**
   * Resets the **cellEditing** state to the `initialState.cellEditing`, or `true` can be passed to force a default blank state reset to `null`.
   */
  resetEditingCell: (defaultState?: boolean) => void
  /**
   * Sets or updates the `state.cellEditing` state.
   */
  setEditingCell: (updater: Updater<EditingCellId | null>) => void
}

//

export const CellEditing: TableFeature = {
  getInitialState: (state): CellEditingTableState => {
    return {
      cellEditing: null,
      ...state,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): CellEditingOptions<TData> => {
    return {
      onCellEditingChange: makeStateUpdater('cellEditing', table),
      enableCellEditing: true,
    }
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setEditingCell = updater =>
      table.options.onCellEditingChange?.(updater)
    table.getEditingCell = () => table.getState().cellEditing ?? null
    table.resetEditingCell = defaultState =>
      table.setEditingCell(
        defaultState ? null : (table.initialState.cellEditing ?? null)
      )
  },

  createCell: <TData extends RowData>(
    cell: Cell<TData, unknown>,
    column: Column<TData>,
    row: Row<TData>,
    table: Table<TData>
  ): void => {
    cell.getIsEditing = () => {
      const editing = table.getEditingCell()
      return (
        editing !== null &&
        editing.rowId === row.id &&
        editing.columnId === column.id
      )
    }

    cell.getCanEdit = () => {
      if (typeof table.options.enableCellEditing === 'function') {
        return table.options.enableCellEditing(cell)
      }

      return table.options.enableCellEditing ?? true
    }

    cell.beginEdit = () => {
      if (!cell.getCanEdit()) return
      table.setEditingCell({ rowId: row.id, columnId: column.id })
    }

    cell.commitEdit = value => {
      table.options.onCellEdit?.({
        rowId: row.id,
        columnId: column.id,
        value,
        cell,
      })
      table.resetEditingCell()
    }

    cell.cancelEdit = () => {
      table.resetEditingCell()
    }
  },
}
