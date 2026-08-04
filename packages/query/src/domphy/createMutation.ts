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

declare const process:
  | { env: Record<string, string | undefined> }
  | undefined

// Dev-only warning guard, same pattern as @domphy/core's dev.ts — production
// bundlers fold this to `false` and tree-shake the guarded warnings away.
const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production"

type MutationResult<TData, TError, TVariables, TContext> =
  MutationObserverResult<TData, TError, TVariables, TContext>

/**
 * Reactive handle around a `MutationObserver`.
 *
 * **Lifecycle contract (recommended):** `destroy()` is manual — call it from
 * the owning subtree's `_onRemove` (or a `behavior()` instance's `destroy`)
 * so the observer subscription and the reactive state are released with the
 * DOM that uses them. Skipping it leaks the subscription for the mutation's
 * whole cache lifetime. As a cheap tripwire, the handle dev-warns when a
 * field is read after `destroy()` and when `destroy()` is called twice.
 */
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
  /**
   * Unsubscribes the observer, disposes the reactive state, and resets the
   * mutation (removing it from the cache). Call it once, from the owning
   * subtree's `_onRemove` (see the contract note above); dev-warns on a
   * second call and on field reads after destruction.
   */
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

  let destroyed = false
  let readAfterDestroyWarned = false

  const read = <K extends keyof MutationResult<TData, TError, TVariables, TContext>>(
    key: K,
    listener?: Listener,
  ): MutationResult<TData, TError, TVariables, TContext>[K] => {
    if (__DEV__ && destroyed && !readAfterDestroyWarned) {
      readAfterDestroyWarned = true
      console.warn(
        "[@domphy/query] MutationHandle field read after destroy(). The value is " +
          "stale — the observer was unsubscribed. Call destroy() only from " +
          "_onRemove of the subtree that owns the handle, and keep renders " +
          "above that subtree from reading it afterwards.",
      )
    }
    return field(key, listener)
  }

  return {
    state,
    observer,
    data: (l) => read("data", l),
    error: (l) => read("error", l),
    variables: (l) => read("variables", l),
    status: (l) => read("status", l),
    isPending: (l) => read("isPending", l),
    isSuccess: (l) => read("isSuccess", l),
    isError: (l) => read("isError", l),
    isIdle: (l) => read("isIdle", l),
    mutate: (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(() => {})
    },
    mutateAsync: (variables, mutateOptions) =>
      observer.mutate(variables, mutateOptions),
    reset: () => observer.reset(),
    destroy: () => {
      if (__DEV__ && destroyed) {
        console.warn(
          "[@domphy/query] MutationHandle.destroy() called twice — the second " +
            "call is a no-op. This usually means two owners think they own " +
            "the handle; keep exactly one _onRemove responsible for it.",
        )
      }
      if (destroyed) return
      destroyed = true
      release()
      observer.reset()
    },
  }
}
