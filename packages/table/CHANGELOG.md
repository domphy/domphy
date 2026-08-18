# @domphy/table Changelog

## 0.19.2
- `commitEdit` / `cancelEdit` call `resetEditingCell(true)` so they always exit edit mode (not restore `initialState.cellEditing`).
- `commitEdit` resets editing state in `finally` so a throwing `onCellEdit` still exits.
- `createDomphyTable.setOptions` merges a raw options object with the previous options and always keeps the adapter `onStateChange` wrapper.
- `RowPinning._getPinnedRows` skips pinned ids that are no longer in the data (`getRow` no longer throws).
- `CellEditing` types on `Table` / `Cell` / `TableState` are `Partial` — the feature is opt-in (`_features: [CellEditing]`), not in `builtInFeatures`.

## 0.19.0
- New opt-in `CellEditing` feature (Domphy-original, no TanStack counterpart — not part of the built-in feature list; pass `_features: [CellEditing]`). State `cellEditing: { rowId, columnId } | null` (one cell edits at a time); options `enableCellEditing` (boolean or per-cell function, default `true`), `onCellEditingChange`, `onCellEdit` (commit hook). Table methods `setEditingCell` / `getEditingCell` / `resetEditingCell`; cell methods `beginEdit` / `commitEdit` / `cancelEdit` / `getIsEditing` / `getCanEdit`.

## 0.18.1
- Initial release: 1-1 port of @tanstack/table-core v8.21.3 + Domphy adapter (`createDomphyTable`).
