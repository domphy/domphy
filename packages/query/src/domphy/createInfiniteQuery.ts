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
import { bindResult } from "./bindResult.js"

type InfiniteResult<TData, TError> = InfiniteQueryObserverResult<TData, TError>

/** Reactive handle around an `InfiniteQueryObserver`. */
export interface InfiniteQueryHandle<TData = unknown, TError = DefaultError> {
  state: ReturnType<typeof bindResult<InfiniteResult<TData, TError>>>["state"]
  observer: InfiniteQueryObserver<any, TError, TData, any, any>
  data(listener?: Listener): InfiniteResult<TData, TError>["data"]
  error(listener?: Listener): TError | null
  status(listener?: Listener): InfiniteResult<TData, TError>["status"]
  isPending(listener?: Listener): boolean
  isFetching(listener?: Listener): boolean
  isSuccess(listener?: Listener): boolean
  isError(listener?: Listener): boolean
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
  destroy(): void
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

  return {
    state,
    observer: observer as InfiniteQueryHandle<TData, TError>["observer"],
    data: (l) => field("data", l),
    error: (l) => field("error", l),
    status: (l) => field("status", l),
    isPending: (l) => field("isPending", l),
    isFetching: (l) => field("isFetching", l),
    isSuccess: (l) => field("isSuccess", l),
    isError: (l) => field("isError", l),
    hasNextPage: (l) => field("hasNextPage", l),
    hasPreviousPage: (l) => field("hasPreviousPage", l),
    isFetchingNextPage: (l) => field("isFetchingNextPage", l),
    isFetchingPreviousPage: (l) => field("isFetchingPreviousPage", l),
    fetchNextPage: (next) => observer.fetchNextPage(next),
    fetchPreviousPage: (previous) => observer.fetchPreviousPage(previous),
    refetch: (refetchOptions) =>
      observer.refetch(refetchOptions) as Promise<InfiniteResult<TData, TError>>,
    destroy: () => {
      release()
      observer.destroy()
    },
  }
}
