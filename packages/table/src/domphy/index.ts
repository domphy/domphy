// Domphy adapter for @domphy/table (not part of the byte-identical table-core
// port). Wires table-core's controlled-state loop to Domphy reactivity so a
// subtree re-renders on any table state change while keeping the full
// table-core API on the returned `.table`.
export { createDomphyTable } from "./createDomphyTable.js"
export type { DomphyTable } from "./createDomphyTable.js"
