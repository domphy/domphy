---
title: "Advanced Patterns"
description: "Polling, dependent queries, select/transform, retry strategies, optimistic updates with rollback, and query batching."
---

# Advanced Patterns

## Polling

Automatically refetch on an interval with `refetchInterval`:

```ts
const prices = createQuery({
  queryKey: () => ["prices"],
  queryFn: fetchPrices,
  refetchInterval: 5000,           // ms — refetch every 5 seconds
  refetchIntervalInBackground: true, // keep polling even when tab is hidden
})
```

Stop polling conditionally:

```ts
const job = createQuery({
  queryKey: () => ["job", jobId],
  queryFn: () => fetchJob(jobId),
  refetchInterval: (query) =>
    query.state.data?.status === "done" ? false : 2000,  // stop when complete
})
```

## Dependent queries

Wait for one query's result before starting another using `enabled`:

```ts
const user = createQuery({
  queryKey: () => ["user", userId],
  queryFn: () => fetchUser(userId),
})

const posts = createQuery({
  queryKey: () => ["posts", user.data()?.id],
  queryFn: () => fetchPosts(user.data()!.id),
  enabled: () => !!user.data()?.id,    // only run when user is loaded
})
```

`enabled: false` also works as a static disable (e.g. feature flags, dev-only queries).

## Skipping queries with `skipToken`

Use the `skipToken` sentinel instead of `enabled` when the key itself depends on optional data:

```ts
import { skipToken } from "@domphy/query"

const profile = createQuery({
  queryKey: () => ["profile", selectedId ?? skipToken],
  queryFn: selectedId ? () => fetchProfile(selectedId) : skipToken,
})
```

When `skipToken` is the `queryFn`, the query is permanently disabled until it changes.

## Select / transform

Transform query data in the observer without changing the cache:

```ts
const users = createQuery({
  queryKey: () => ["users"],
  queryFn: fetchUsers,
  select: (data) => data.filter((u) => u.active).map((u) => u.name),
})

// users.data() is now string[] even though the cache holds User[]
```

`select` runs after every refetch. The result is referentially stable between refetches if the raw data is unchanged (`keepPreviousData` logic).

## Custom retry

Override the default 3 retries:

```ts
const payment = createQuery({
  queryKey: () => ["payment", id],
  queryFn: () => processPayment(id),
  retry: (failCount, error) => {
    if ((error as any).status === 401) return false     // don't retry auth failures
    return failCount < 2                                // retry up to 2 times
  },
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),  // exponential backoff, max 30s
})
```

## Optimistic mutations with rollback

Apply an update immediately and roll back if the mutation fails:

```ts
const client = useQueryClient()

const toggle = createMutation({
  mutationFn: (id: string) => toggleTask(id),

  onMutate: async (id) => {
    // Cancel any in-flight refetches so they don't overwrite
    await client.cancelQueries({ queryKey: ["tasks"] })

    // Snapshot current value
    const previous = client.getQueryData<Task[]>(["tasks"])

    // Optimistically update the cache
    client.setQueryData<Task[]>(["tasks"], (old = []) =>
      old.map((t) => t.id === id ? { ...t, done: !t.done } : t)
    )

    return { previous }   // return context for rollback
  },

  onError: (_err, _id, context) => {
    // Roll back on failure
    client.setQueryData(["tasks"], context?.previous)
  },

  onSettled: () => {
    // Always refetch to sync with server
    client.invalidateQueries({ queryKey: ["tasks"] })
  },
})
```

## Request deduplication

When multiple observers subscribe to the same `queryKey` simultaneously, only **one** network request fires. All observers receive the same response:

```ts
// Both createQuery calls below share a single fetch for ["config"]
const configA = createQuery({ queryKey: () => ["config"], queryFn: fetchConfig })
const configB = createQuery({ queryKey: () => ["config"], queryFn: fetchConfig })
// fetchConfig() is called once; configA and configB both resolve to the same data
```

Deduplication is in-flight only. A second subscriber arriving after the first response is cached gets the cache, not a new fetch.

## Mutation sequencing / batching

Run mutations sequentially with an async queue:

```ts
import { createMutation } from "@domphy/query/domphy"

const queue = toState<string[]>([])
let running = false

const save = createMutation({
  mutationFn: (id: string) => saveDraft(id),
  onSettled: () => {
    const next = queue.get().slice(1)
    queue.set(next)
    running = false
    if (next.length > 0) {
      running = true
      save.mutate(next[0])
    }
  },
})

function enqueue(id: string) {
  queue.set((prev) => [...prev, id])
  if (!running) {
    running = true
    save.mutate(id)
  }
}
```

## Parallel queries

Run multiple queries at once with `QueriesObserver`:

```ts
import { QueriesObserver } from "@domphy/query"

const observer = new QueriesObserver(client, [
  { queryKey: ["user"], queryFn: fetchUser },
  { queryKey: ["settings"], queryFn: fetchSettings },
  { queryKey: ["notifications"], queryFn: fetchNotifications },
])
```

Or use the adapter version:

```ts
import { createQueries } from "@domphy/query/domphy"

const [user, settings, notifications] = createQueries([
  { queryKey: () => ["user"],          queryFn: fetchUser },
  { queryKey: () => ["settings"],      queryFn: fetchSettings },
  { queryKey: () => ["notifications"], queryFn: fetchNotifications },
])
```

## Background refetch behavior

| Option | Default | Effect |
|--------|---------|--------|
| `staleTime` | `0` | Data is considered stale immediately. Stale data triggers background refetch on mount / focus. |
| `gcTime` | `5min` | How long unused (no observers) query data stays in cache before garbage collected. |
| `refetchOnMount` | `true` | Refetch stale data when an observer mounts. Set `"always"` to refetch even fresh data. |
| `refetchOnWindowFocus` | `true` | Refetch when window regains focus. |
| `refetchOnReconnect` | `true` | Refetch when network reconnects. |
| `networkMode` | `"online"` | `"always"` ignores online status (useful for non-network queries). |

Disable focus refetch for static data:

```ts
const constants = createQuery({
  queryKey: () => ["constants"],
  queryFn: fetchConstants,
  staleTime: Infinity,       // never stale
  refetchOnWindowFocus: false,
})
```
