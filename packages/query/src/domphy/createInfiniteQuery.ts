import type { Listener } from "@domphy/core"
import { InfiniteQueryObserver } from "../infiniteQueryObserver.js"
import type { QueryClient } from "../queryClient.js"
import type {
  DefaultError,
  FetchNextPageOptions,
  FetchPreviousPageOptions,
  InfiniteQueryObserverOptions,
  InfiniteQueryObserverResult,
  QueryKey,
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

type InfiniteResult<TData, TError> = InfiniteQueryObserverResult<TData, TError>

/**
 * Reactive handle around an `InfiniteQueryObserver`.
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
export interface InfiniteQueryHandle<TData = unknown, TError = DefaultError> {
  state: ReturnType<typeof bindResult<InfiniteResult<TData, TError>>>["state"]
  observer: InfiniteQueryObserver<any, TError, TData, any, any>
  data(listener?: Listener): InfiniteResult<TData, TError>["data"]
  error(listener?: Listener): TError | null
  status(listener?: Listener): InfiniteResult<TData, TError>["status"]
  fetchStatus(listener?: Listener): InfiniteResult<TData, TError>["fetchStatus"]
  isPending(listener?: Listener): boolean
  isLoading(listener?: Listener): boolean
  isFetching(listener?: Listener): boolean
  isSuccess(listener?: Listener): boolean
  isError(listener?: Listener): boolean
  isRefetching(listener?: Listener): boolean
  isStale(listener?: Listener): boolean
  /** True when the data shown is placeholder data (e.g. `placeholderData: keepPreviousData`). */
  isPlaceholderData(listener?: Listener): boolean
  hasNextPage(listener?: Listener): boolean
  hasPreviousPage(listener?: Listener): boolean
  isFetchingNextPage(listener?: Listener): boolean
  isFetchingPreviousPage(listener?: Listener): boolean
  fetchNextPage(
    options?: FetchNextPageOptions,
  ): Promise<InfiniteResult<TData, TError>>
  fetchPreviousPage(
    options?: FetchPreviousPageOptions,
  ): Promise<InfiniteResult<TData, TError>>
  refetch(options?: RefetchOptions): Promise<InfiniteResult<TData, TError>>
  /**
   * Unsubscribes the observer and disposes the reactive state. Call it once,
   * from the owning subtree's `_onRemove` (see the contract note above);
   * dev-warns on a second call and on field reads after destruction.
   */
  destroy(): void
}

function throwOnErrorIfNeeded(
  observer: InfiniteQueryObserver<any, any, any, any, any>,
  listener?: Listener,
): void {
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

export function createInfiniteQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  client: QueryClient,
  options: InfiniteQueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >,
): InfiniteQueryHandle<TData, TError> {
  const observer = new InfiniteQueryObserver<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >(client, options as any)

  const { state, field, release } = bindResult<InfiniteResult<TData, TError>>(
    observer.getCurrentResult() as InfiniteResult<TData, TError>,
    (callback) => observer.subscribe(callback as any),
  )

  let destroyed = false
  let readAfterDestroyWarned = false

  const read = <K extends keyof InfiniteResult<TData, TError>>(
    key: K,
    listener?: Listener,
  ): InfiniteResult<TData, TError>[K] => {
    if (__DEV__ && destroyed && !readAfterDestroyWarned) {
      readAfterDestroyWarned = true
      console.warn(
        "[@domphy/query] InfiniteQueryHandle field read after destroy(). The value is " +
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
    observer: observer as InfiniteQueryHandle<TData, TError>["observer"],
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
    hasNextPage: (l) => read("hasNextPage", l),
    hasPreviousPage: (l) => read("hasPreviousPage", l),
    isFetchingNextPage: (l) => read("isFetchingNextPage", l),
    isFetchingPreviousPage: (l) => read("isFetchingPreviousPage", l),
    fetchNextPage: (next) => observer.fetchNextPage(next),
    fetchPreviousPage: (previous) => observer.fetchPreviousPage(previous),
    refetch: (refetchOptions) =>
      observer.refetch(refetchOptions) as Promise<InfiniteResult<TData, TError>>,
    destroy: () => {
      if (__DEV__ && destroyed) {
        console.warn(
          "[@domphy/query] InfiniteQueryHandle.destroy() called twice — the second " +
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
