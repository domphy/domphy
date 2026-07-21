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

/**
 * Reactive handle around a `QueryObserver`. Every accessor takes an optional
 * Domphy listener `l` and subscribes it to that field only. Call `destroy()`
 * from the owning subtree's `_onRemove` to unsubscribe.
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

  const read = <K extends keyof QueryObserverResult<TData, TError>>(
    key: K,
    listener?: Listener,
  ): QueryObserverResult<TData, TError>[K] => {
    throwOnErrorIfNeeded(observer, listener)
    return field(key, listener)
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
      release()
      observer.destroy()
    },
  }
}
