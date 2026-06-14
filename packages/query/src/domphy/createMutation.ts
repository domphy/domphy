import type { Listener } from "@domphy/core"
import { MutationObserver } from "../mutationObserver.js"
import type { QueryClient } from "../queryClient.js"
import type {
  DefaultError,
  MutateOptions,
  MutationObserverOptions,
  MutationObserverResult,
} from "../types.js"
import { bindResult } from "./bindResult.js"

type MutationResult<TData, TError, TVariables, TContext> =
  MutationObserverResult<TData, TError, TVariables, TContext>

/** Reactive handle around a `MutationObserver`. */
export interface MutationHandle<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> {
  state: ReturnType<
    typeof bindResult<MutationResult<TData, TError, TVariables, TContext>>
  >["state"]
  observer: MutationObserver<TData, TError, TVariables, TContext>
  data(listener?: Listener): TData | undefined
  error(listener?: Listener): TError | null
  variables(listener?: Listener): TVariables | undefined
  status(
    listener?: Listener,
  ): MutationResult<TData, TError, TVariables, TContext>["status"]
  isPending(listener?: Listener): boolean
  isSuccess(listener?: Listener): boolean
  isError(listener?: Listener): boolean
  isIdle(listener?: Listener): boolean
  /** Fire-and-forget; rejections are swallowed (read them via `error`). */
  mutate(
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>,
  ): void
  /** Same as `mutate` but returns the promise so the caller can await/catch. */
  mutateAsync(
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>,
  ): Promise<TData>
  reset(): void
  destroy(): void
}

export function createMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  client: QueryClient,
  options: MutationObserverOptions<TData, TError, TVariables, TContext>,
): MutationHandle<TData, TError, TVariables, TContext> {
  const observer = new MutationObserver<TData, TError, TVariables, TContext>(
    client,
    options,
  )

  const { state, field, release } = bindResult<
    MutationResult<TData, TError, TVariables, TContext>
  >(observer.getCurrentResult(), (callback) => observer.subscribe(callback))

  return {
    state,
    observer,
    data: (l) => field("data", l),
    error: (l) => field("error", l),
    variables: (l) => field("variables", l),
    status: (l) => field("status", l),
    isPending: (l) => field("isPending", l),
    isSuccess: (l) => field("isSuccess", l),
    isError: (l) => field("isError", l),
    isIdle: (l) => field("isIdle", l),
    mutate: (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(() => {})
    },
    mutateAsync: (variables, mutateOptions) =>
      observer.mutate(variables, mutateOptions),
    reset: () => observer.reset(),
    destroy: () => {
      release()
      observer.reset()
    },
  }
}
