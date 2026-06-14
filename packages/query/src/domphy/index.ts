// Domphy adapter for @domphy/query (not part of the byte-identical query-core
// port). Binds TanStack query/mutation observers to Domphy reactivity so result
// fields can be read directly in element definitions with a listener.
export { bindResult } from "./bindResult.js"
export type { ReactiveResult } from "./bindResult.js"
export { createQuery } from "./createQuery.js"
export type { QueryHandle } from "./createQuery.js"
export { createInfiniteQuery } from "./createInfiniteQuery.js"
export type { InfiniteQueryHandle } from "./createInfiniteQuery.js"
export { createMutation } from "./createMutation.js"
export type { MutationHandle } from "./createMutation.js"
