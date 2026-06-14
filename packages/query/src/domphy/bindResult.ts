import { type Listener, RecordState } from "@domphy/core"

/**
 * Bridges a TanStack observer's result object into a Domphy `RecordState`.
 *
 * Each result field becomes an independently reactive key, so a component that
 * only reads `data` does not re-render when `isFetching` toggles. Updates are
 * diffed by reference (TanStack already memoizes the result object and its
 * fields), so only fields that actually changed notify their subscribers.
 *
 * The result type (a discriminated union with no index signature) is stored in
 * a loosely-typed `RecordState` internally; type safety is restored at the
 * `field` accessor, which is keyed by `TResult`.
 */
export interface ReactiveResult<TResult> {
  /** Per-key reactive view of the observer result. */
  state: RecordState<Record<string, unknown>>
  /** Reads one result field and, when a listener is passed, subscribes to it. */
  field<K extends keyof TResult>(key: K, listener?: Listener): TResult[K]
  /** Unsubscribes from the observer and disposes the reactive state. */
  release(): void
}

export function bindResult<TResult>(
  initial: TResult,
  subscribe: (callback: (result: TResult) => void) => () => void,
): ReactiveResult<TResult> {
  const state = new RecordState<Record<string, unknown>>({
    ...(initial as Record<string, unknown>),
  })

  const unsubscribe = subscribe((result) => {
    const record = result as Record<string, unknown>
    for (const key in record) {
      if (!Object.is(state.get(key), record[key])) {
        state.set(key, record[key])
      }
    }
  })

  return {
    state,
    field: (key, listener) =>
      state.get(key as string, listener) as TResult[typeof key],
    release: () => {
      unsubscribe()
      state._dispose()
    },
  }
}
