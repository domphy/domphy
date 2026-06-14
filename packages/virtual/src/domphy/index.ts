// Domphy adapter for @domphy/virtual (not part of the byte-identical
// virtual-core port). Binds a TanStack Virtualizer to Domphy reactivity so the
// visible items re-render on scroll/resize while the full virtual-core API stays
// available on the returned `.virtualizer`.
export { createVirtualizer } from "./createVirtualizer.js"
export type {
  CreateVirtualizerOptions,
  VirtualizerHandle,
} from "./createVirtualizer.js"
