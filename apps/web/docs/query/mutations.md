<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Mutation from "../demos/query/mutation.ts?raw"
</script>

# Mutations

Mutations are for writes — create, update, delete. Unlike queries they run on demand via `mutate()`, are never cached by key, and never refetch on their own.

## Live Example

<CodeEditor :code="Mutation" />

## Basic Mutation

```ts
import { MutationObserver } from "@domphy/query"
import { toState } from "@domphy/core"

const saving = toState(false)

const mutation = new MutationObserver(queryClient, {
    mutationFn: (todo: { title: string }) =>
        fetch("/api/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(todo),
        }).then((res) => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
})

mutation.subscribe((result) => saving.set(result.isPending))
```

Trigger it from an event handler:

```ts
{
    button: (l) => (saving.get(l) ? "Saving..." : "Save"),
    $: [button({ color: "primary" })],
    ariaDisabled: (l) => saving.get(l),
    onClick: () => mutation.mutate({ title: "New todo" }).catch(() => undefined),
}
```

`mutate()` returns a promise that rejects on failure — handle it (or read `result.error` from the subscription instead).

## Lifecycle Callbacks

```ts
new MutationObserver(queryClient, {
    mutationFn: updateTodo,
    onMutate: (variables) => {
        // runs before mutationFn; the return value becomes `context`
        return { startedAt: performance.now() }
    },
    onSuccess: (data, variables, context) => {},
    onError: (error, variables, context) => {},
    onSettled: (data, error, variables, context) => {
        // success or error — the usual place to invalidate
        queryClient.invalidateQueries({ queryKey: ["todos"] })
    },
})
```

## Optimistic Updates

Update the cache immediately in `onMutate`, roll back from `context` on error:

```ts
new MutationObserver(queryClient, {
    mutationFn: updateTodo,
    onMutate: async (newTodo) => {
        // stop in-flight refetches from overwriting the optimistic value
        await queryClient.cancelQueries({ queryKey: ["todos"] })

        const previous = queryClient.getQueryData<Todo[]>(["todos"])
        queryClient.setQueryData<Todo[]>(["todos"], (old) =>
            (old ?? []).map((todo) => (todo.id === newTodo.id ? newTodo : todo)),
        )
        return { previous }
    },
    onError: (error, newTodo, context) => {
        queryClient.setQueryData(["todos"], context?.previous)
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["todos"] })
    },
})
```

Because the cache update notifies every `QueryObserver` on `["todos"]`, the optimistic value flows through the normal bridge into `toState` — the UI updates instantly with no extra wiring.

## Mutation Result

The subscription result mirrors queries:

- `status`: `"idle" | "pending" | "error" | "success"`
- `isIdle`, `isPending`, `isError`, `isSuccess`
- `data`, `error`, `variables`, `failureCount`
- `mutate(variables)`, `reset()`

## Retry

Mutations do not retry by default (writes are not safely repeatable in general). Opt in per mutation:

```ts
new MutationObserver(queryClient, {
    mutationFn: sendTelemetry,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
})
```
