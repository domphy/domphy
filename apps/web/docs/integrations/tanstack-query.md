<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import tanstackQuery from "../demos/integrations/tanstack-query.ts?raw"
</script>

# TanStack Query

Install the framework-agnostic core — Domphy does not wrap it.

```bash
npm install @tanstack/query-core
```

## Live Example

<CodeEditor :code="tanstackQuery" />

## Pattern

TanStack Query manages async data fetching, caching, and background refetching. Domphy handles the UI. The bridge is `toState` — subscribe to query result changes and push them into states that the UI reads reactively.

```ts
import { QueryClient, QueryObserver } from "@tanstack/query-core"
import { toState } from "@domphy/core"

const queryClient = new QueryClient()

function createQuery<T>(queryKey: unknown[], queryFn: () => Promise<T>) {
    const data     = toState<T | undefined>(undefined)
    const loading  = toState(true)
    const error    = toState<Error | null>(null)

    const observer = new QueryObserver<T>(queryClient, { queryKey, queryFn })

    observer.subscribe((result) => {
        data.set(result.data)
        loading.set(result.isPending)
        error.set(result.error as Error | null)
    })

    return { data, loading, error }
}
```

Use in elements — states drive reactivity automatically:

```ts
import { type DomphyElement } from "@domphy/core"
import { spinner, alert } from "@domphy/ui"

const { data, loading, error } = createQuery(
    ["users"],
    () => fetch("/api/users").then(r => r.json())
)

const App: DomphyElement<"div"> = {
    div: [
        {
            // loading indicator
            span: null,
            $: [spinner()],
            hidden: (listener) => !loading.get(listener),
        },
        {
            // error state
            div: (listener) => error.get(listener)?.message ?? "",
            $: [alert({ color: "error" })],
            hidden: (listener) => !error.get(listener),
        },
        {
            // data list
            ul: (listener) => (data.get(listener) as any[] ?? []).map((user) => ({
                li: user.name,
                _key: user.id,
            })),
            hidden: (listener) => loading.get(listener),
        },
    ],
}
```

## Mutation

Same pattern — bridge the mutation function to an event handler, update state on success:

```ts
import { MutationObserver } from "@tanstack/query-core"

const saving = toState(false)

const mutation = new MutationObserver(queryClient, {
    mutationFn: (data: FormData) => fetch("/api/users", { method: "POST", body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
})

mutation.subscribe((result) => saving.set(result.isPending))

// usage in element
{
    button: "Save",
    $: [button()],
    ariaDisabled: (listener) => saving.get(listener),
    onClick: () => mutation.mutate(formData),
}
```

## Key points

- `QueryClient` and `QueryObserver` are framework-agnostic — no React needed
- `observer.subscribe()` fires on every state change (loading → success → refetch)
- Each `toState` is independent — UI re-renders only the part that reads the changed state
- `queryClient.invalidateQueries()` triggers refetch and propagates through the same observer

