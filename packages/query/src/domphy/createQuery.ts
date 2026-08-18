import type { Listener } from "@domphy/core"
import { QueryObserver } from "../queryObserver.js"
import type { QueryClient } from "../queryClient.js"
import type {
  DefaultError,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
  RefetchOptions,
} from "../types.js"
import { shouldThrowError } from "../utils.js"
import { bindResult } from "./bindResult.js"

declare const process:
  | { env: Record<string, string | undefined> }
  | undefined

// Dev-only warning guard, same pattern as @domphy/core's dev.ts — production
// bundlers fold this to `false` and tree-shake the guarded warnings away.
const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production"

/**
 * Reactive handle around a `QueryObserver`. Every accessor takes an optional
 * Domphy listener `l` and subscribes it to that field only.
 *
 * **Lifecycle contract (recommended):** `destroy()` is manual — call it from
 * the owning subtree's `_onRemove` (or a `behavior()` instance's `destroy`)
 * so the observer subscription and the reactive state are released with the
 * DOM that uses them. Skipping it leaks the subscription for the query's
 * whole cache lifetime. As a cheap tripwire, the handle dev-warns when a
 * field is read after `destroy()` and when `destroy()` is called twice.
 *
 * When `throwOnError` is true (or a function that returns true), reading any
 * field **with a listener** (render path) throws `result.error` so a parent
 * `_onError` / `errorBoundary()` can catch it — same contract as TanStack
 * React Query's render-time throw.
 */
export interface QueryHandle<TData = unknown, TError = DefaultError> {
  state: ReturnType<typeof bindResult<QueryObserverResult<TData, TError>>>["state"]
  observer: QueryObserver<any, TError, TData, any, any>
  data(listener?: Listener): TData | undefined
  error(listener?: Listener): TError | null
  status(listener?: Listener): QueryObserverResult<TData, TError>["status"]
  fetchStatus(listener?: Listener): QueryObserverResult<TData, TError>["fetchStatus"]
  isPending(listener?: Listener): boolean
  isLoading(listener?: Listener): boolean
  isFetching(listener?: Listener): boolean
  isSuccess(listener?: Listener): boolean
  isError(listener?: Listener): boolean
  isRefetching(listener?: Listener): boolean
  isStale(listener?: Listener): boolean
  /** True when the data shown is placeholder data (e.g. `placeholderData: keepPreviousData`). */
  isPlaceholderData(listener?: Listener): boolean
  refetch(options?: RefetchOptions): Promise<QueryObserverResult<TData, TError>>
  setOptions(options: QueryObserverOptions<any, TError, TData, any, any>): void
  /**
   * Unsubscribes the observer and disposes the reactive state. Call it once,
   * from the owning subtree's `_onRemove` (see the contract note above);
   * dev-warns on a second call and on field reads after destruction.
   */
  destroy(): void
}

function throwOnErrorIfNeeded(
  observer: QueryObserver<any, any, any, any, any>,
  listener?: Listener,
): void {
  // Imperative reads (no listener) never throw — only the reactive render path.
  if (!listener) return
  const result = observer.getCurrentResult()
  if (
    result.isError &&
    result.error != null &&
    shouldThrowError(observer.options.throwOnError, [
      result.error,
      observer.getCurrentQuery(),
    ])
  ) {
    throw result.error
  }
}

export function createQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  client: QueryClient,
  options: QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
): QueryHandle<TData, TError> {
  const observer = new QueryObserver<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >(client, options)

  const { state, field, release } = bindResult<QueryObserverResult<TData, TError>>(
    observer.getCurrentResult(),
    (callback) => observer.subscribe(callback),
  )

  let destroyed = false
  let readAfterDestroyWarned = false

  const read = <K extends keyof QueryObserverResult<TData, TError>>(
    key: K,
    listener?: Listener,
  ): QueryObserverResult<TData, TError>[K] => {
    if (__DEV__ && destroyed && !readAfterDestroyWarned) {
      readAfterDestroyWarned = true
      console.warn(
        "[@domphy/query] QueryHandle field read after destroy(). The value is " +
          "stale — the observer was unsubscribed. Call destroy() only from " +
          "_onRemove of the subtree that owns the handle, and keep renders " +
          "above that subtree from reading it afterwards.",
      )
    }
    // Subscribe first so a later recover (reset/refetch) notifies this
    // render. Throwing before field() leaves the listener unsubscribed —
    // recover then has no one to wake, matching TanStack React Query's
    // useSyncExternalStore-then-throw order.
    const value = field(key, listener)
    throwOnErrorIfNeeded(observer, listener)
    return value
  }

  return {
    state,
    observer: observer as QueryHandle<TData, TError>["observer"],
    data: (l) => read("data", l),
    error: (l) => read("error", l),
    status: (l) => read("status", l),
    fetchStatus: (l) => read("fetchStatus", l),
    isPending: (l) => read("isPending", l),
    isLoading: (l) => read("isLoading", l),
    isFetching: (l) => read("isFetching", l),
    isSuccess: (l) => read("isSuccess", l),
    isError: (l) => read("isError", l),
    isRefetching: (l) => read("isRefetching", l),
    isStale: (l) => read("isStale", l),
    isPlaceholderData: (l) => read("isPlaceholderData", l),
    refetch: (refetchOptions) => observer.refetch(refetchOptions),
    setOptions: (next) => observer.setOptions(next),
    destroy: () => {
      if (__DEV__ && destroyed) {
        console.warn(
          "[@domphy/query] QueryHandle.destroy() called twice — the second " +
            "call is a no-op. This usually means two owners think they own " +
            "the handle; keep exactly one _onRemove responsible for it.",
        )
      }
      if (destroyed) return
      destroyed = true
      release()
      observer.destroy()
    },
  }
}
