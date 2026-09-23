// Port of @tanstack/react-router's routerStores.ts without the React layer:
// @tanstack/store atoms (framework-agnostic) replace @tanstack/react-store.
import { batch, createAtom } from '@tanstack/store'
import { isServer } from '@domphy/router/isServer'
import {
  createNonReactiveMutableStore,
  createNonReactiveReadonlyStore,
} from '../stores'
import type { Readable } from '@tanstack/store'
import type { AnyRouter, RouterState } from '../router'
import type { GetStoreConfig } from '../stores'

// Note: upstream's react adapter augments RouterReadableStore with the
// reactive Readable interface. That augmentation would poison the core
// files compiled inside this same package (non-reactive store factories
// would no longer satisfy the interface), so `subscribeToRouterState`
// casts to Readable locally instead.

export const getStoreFactory: GetStoreConfig = (opts) => {
  if (isServer ?? opts.isServer) {
    return {
      createMutableStore: createNonReactiveMutableStore,
      createReadonlyStore: createNonReactiveReadonlyStore,
      batch: (fn) => fn(),
    }
  }

  return {
    createMutableStore: createAtom,
    createReadonlyStore: createAtom,
    batch,
  }
}

/**
 * Subscribes to the router's state store — the headless equivalent of
 * `@tanstack/react-router`'s `useRouterState`, which reads this same
 * `router.stores.__store` through `useSelector`.
 *
 * `router.subscribe(...)` reports lifecycle EVENTS, and none of them fires at
 * the moment `status` flips to `'pending'`: `onBeforeLoad` is emitted while
 * the status is still `'idle'` and `onLoad` only after the loaders settle. An
 * app that mirrors router state from events alone therefore cannot render a
 * pending/loading state. The store publishes every write, including that one,
 * so this is what a spinner subscribes to.
 *
 * @returns An unsubscribe function.
 *
 * @example
 * ```ts
 * const state = toState(router.state)
 * subscribeToRouterState(router, (next) => state.set(next))
 * const Spinner = { div: (l) => (state.get(l).isLoading ? "Loading..." : null) }
 * ```
 */
export function subscribeToRouterState<TRouter extends AnyRouter>(
  router: TRouter,
  callback: (state: RouterState<TRouter['routeTree']>) => void,
): () => void {
  // On the server the stores are the non-reactive variants (no `subscribe`)
  // and the state cannot change during a single render — upstream skips the
  // subscription on that branch too.
  if (isServer ?? router.isServer) {
    return () => {}
  }
  const store = router.stores.__store as unknown as Readable<
    RouterState<TRouter['routeTree']>
  >
  const subscription = store.subscribe(callback)
  return () => subscription.unsubscribe()
}
