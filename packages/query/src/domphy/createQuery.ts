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
import { bindResult } from "./bindResult.js"

/**
 * Reactive handle around a `QueryObserver`. Every accessor takes an optional
 * Domphy listener `l` and subscribes it to that field only. Call `destroy()`
 * from the owning subtree's `_onRemove` to unsubscribe.
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
  refetch(options?: RefetchOptions): Promise<QueryObserverResult<TData, TError>>
  setOptions(options: QueryObserverOptions<any, TError, TData, any, any>): void
  destroy(): void
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

  return {
    state,
    observer: observer as QueryHandle<TData, TError>["observer"],
    data: (l) => field("data", l),
    error: (l) => field("error", l),
    status: (l) => field("status", l),
    fetchStatus: (l) => field("fetchStatus", l),
    isPending: (l) => field("isPending", l),
    isLoading: (l) => field("isLoading", l),
    isFetching: (l) => field("isFetching", l),
    isSuccess: (l) => field("isSuccess", l),
    isError: (l) => field("isError", l),
    isRefetching: (l) => field("isRefetching", l),
    isStale: (l) => field("isStale", l),
    refetch: (refetchOptions) => observer.refetch(refetchOptions),
    setOptions: (next) => observer.setOptions(next),
    destroy: () => {
      release()
      observer.destroy()
    },
  }
}
