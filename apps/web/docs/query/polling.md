---
title: "Polling & Window Focus"
description: "Automatic data refreshing with polling intervals, window focus refetching, and network reconnect."
---

# Polling & Window Focus

## Polling with `refetchInterval`

Auto-refresh data on a timer — useful for dashboards, live feeds, or anything that changes server-side:

```ts
import { createQuery } from "@domphy/query/domphy"

const stats = createQuery({
  queryKey: () => ["stats"],
  queryFn: fetchStats,
  refetchInterval: 5_000,   // refetch every 5 seconds
})
```

Polling runs in the background — the UI shows fresh data while `isFetching` is `true`.

## Conditional polling

Pause polling when the data has reached a terminal state:

```ts
const jobStatus = createQuery({
  queryKey: () => ["job", jobId],
  queryFn: () => fetchJobStatus(jobId),
  refetchInterval: (query) => {
    // Stop polling when job is done or failed
    const status = query.state.data?.status
    if (status === "done" || status === "failed") return false
    return 2_000   // poll every 2 seconds while running
  },
})
```

## `refetchIntervalInBackground`

By default, polling pauses when the browser tab is hidden. Enable background polling:

```ts
const alerts = createQuery({
  queryKey: () => ["alerts"],
  queryFn: fetchAlerts,
  refetchInterval: 30_000,
  refetchIntervalInBackground: true,   // keep polling even when tab is hidden
})
```

## Window focus refetching

When the user returns to your app (tab focus, `Alt+Tab`), stale queries automatically refetch:

```ts
const data = createQuery({
  queryKey: () => ["dashboard"],
  queryFn: fetchDashboard,
  staleTime: 60_000,           // data is fresh for 1 minute
  refetchOnWindowFocus: true,  // refetch when window regains focus (default: true)
})
```

`refetchOnWindowFocus` triggers when:
- User switches back to your browser tab
- User returns from another application

Disable for data that shouldn't silently refresh:

```ts
const draftContent = createQuery({
  queryKey: () => ["draft", id],
  queryFn: () => fetchDraft(id),
  refetchOnWindowFocus: false,   // don't overwrite user edits on tab switch
})
```

## Global config

Set defaults for all queries at the client level:

```ts
const client = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,              // all queries fresh for 30s
      refetchOnWindowFocus: true,     // refetch on focus (default)
      refetchOnReconnect: true,       // refetch when network reconnects
      refetchInterval: false,         // no polling by default
      retry: 3,                       // retry 3 times on failure
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
})
```

## Network reconnect refetching

When the device goes offline and comes back online, stale queries automatically refetch:

```ts
const userProfile = createQuery({
  queryKey: () => ["user", userId],
  queryFn: () => fetchUser(userId),
  refetchOnReconnect: true,   // default: true
})
```

`@domphy/query` subscribes to `window.addEventListener("online")` — no extra setup needed.

## Disabling all background refetching

For data that only refreshes on explicit user action:

```ts
const config = createQuery({
  queryKey: () => ["config"],
  queryFn: fetchConfig,
  staleTime: Infinity,            // never goes stale
  refetchOnWindowFocus: false,    // no focus refetch
  refetchOnReconnect: false,      // no reconnect refetch
  refetchInterval: false,         // no polling
})

// Refresh only on explicit button click
const RefreshButton = {
  button: "Refresh config",
  onClick: () => config.refetch(),
}
```

## `refetch()` on demand

Trigger a refetch manually without invalidating the cache:

```ts
const feed = createQuery({
  queryKey: () => ["feed"],
  queryFn: fetchFeed,
})

const RefreshFeed = {
  button: "↻ Refresh",
  onClick: () => feed.refetch(),
  disabled: (l) => feed.isFetching(l),
}
```

## Detecting staleness

Check if the current data is stale (older than `staleTime`):

```ts
const query = client.getQueryState(["stats"])
const isStale = query?.isStale ?? true   // true if data is older than staleTime

// Or reactively:
const isStale = (l) => {
  const state = client.getQueryState(["stats"])
  return state ? Date.now() - (state.dataUpdatedAt ?? 0) > 30_000 : true
}
```

## Online status indicator

Show the user when the app is offline:

```ts
import { onlineManager } from "@domphy/query"
import { toState } from "@domphy/core"

const isOnline = toState(onlineManager.isOnline())

onlineManager.subscribe((online) => isOnline.set(online))

const OfflineBanner = {
  div: "You're offline — data may be outdated",
  hidden: (l) => isOnline.get(l),
  style: {
    background: "var(--warning-3)",
    color: "var(--warning-11)",
    padding: "8px 16px",
    textAlign: "center",
  },
}
```
