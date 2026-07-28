# @domphy/table Changelog

## 0.19.0
- New opt-in `CellEditing` feature (Domphy-original, no TanStack counterpart — not part of the built-in feature list; pass `_features: [CellEditing]`). State `cellEditing: { rowId, columnId } | null` (one cell edits at a time); options `enableCellEditing` (boolean or per-cell function, default `true`), `onCellEditingChange`, `onCellEdit` (commit hook). Table methods `setEditingCell` / `getEditingCell` / `resetEditingCell`; cell methods `beginEdit` / `commitEdit` / `cancelEdit` / `getIsEditing` / `getCanEdit`.

## 0.18.1
- Initial release: 1-1 port of @tanstack/table-core v8.21.3 + Domphy adapter (`createDomphyTable`).
