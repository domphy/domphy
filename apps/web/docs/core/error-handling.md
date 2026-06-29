---
title: "Error Handling"
description: "Catch render errors, display fallbacks, recover from async failures, and integrate error boundaries."
---

# Error Handling

## Catching errors in render functions

Domphy render functions (listener callbacks) run synchronously. Wrap them in try/catch if they can throw:

```ts
import { toState } from "@domphy/core"

const userData = toState<unknown>(null)

const UserCard = {
  div: (l) => {
    try {
      const user = userData.get(l) as { name: string }
      return `Hello, ${user.name}`
    } catch {
      return "Unable to display user"
    }
  },
}
```

## Error boundary patch

`@domphy/ui` provides an `errorBoundary` patch that catches render errors in its subtree:

```ts
import { errorBoundary } from "@domphy/ui"

const SafeWidget = {
  div: RiskyWidget,
  $: [errorBoundary({
    fallback: (error) => ({
      div: `Something went wrong: ${error.message}`,
      style: { color: "red" },
    }),
    onError: (error) => console.error("Widget error:", error),
  })],
}
```

`errorBoundary` installs a try/catch around the subtree's render and re-mount cycle. When a child throws, the `fallback` function renders instead.

## Async error handling

For async operations (fetching, saving), keep error state alongside loading state:

```ts
import { toState } from "@domphy/core"

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const post = toState<AsyncState<Post>>({ data: null, loading: false, error: null })

async function loadPost(id: string) {
  post.set({ ...post.get(), loading: true, error: null })
  try {
    const data = await fetchPost(id)
    post.set({ data, loading: false, error: null })
  } catch (err) {
    post.set({ ...post.get(), loading: false, error: (err as Error).message })
  }
}

const PostView = {
  div: (l) => {
    const { data, loading, error } = post.get(l)
    if (loading) return { div: "Loading…" }
    if (error)   return { div: error, style: { color: "red" } }
    if (!data)   return { div: "No post" }
    return { article: [{ h1: data.title }, { p: data.body }] }
  },
}
```

## Global error handler

Catch unhandled promise rejections and runtime errors globally:

```ts
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason)
  showErrorToast(String(event.reason))
})

window.addEventListener("error", (event) => {
  console.error("Global error:", event.error)
  showErrorToast(event.message)
})
```

## Error recovery

Allow users to retry after an error with a reset mechanism:

```ts
import { toState } from "@domphy/core"
import { button } from "@domphy/ui"

const fetchState = toState<"idle" | "loading" | "error">("idle")
const errorMessage = toState("")

async function load() {
  fetchState.set("loading")
  try {
    await fetchData()
    fetchState.set("idle")
  } catch (err) {
    errorMessage.set((err as Error).message)
    fetchState.set("error")
  }
}

const Widget = {
  div: (l) => {
    switch (fetchState.get(l)) {
      case "loading": return { div: "Loading…" }
      case "error":   return {
        div: [
          { p: (l) => errorMessage.get(l) },
          {
            button: "Retry",
            $: [button()],
            onClick: () => load(),
          },
        ],
      }
      default: return { div: "Content loaded" }
    }
  },
}
```

## Error boundaries with @domphy/query

When using `@domphy/query`, set `throwOnError: true` to let query errors propagate to the nearest error boundary:

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"
import { errorBoundary } from "@domphy/ui"

const queryClient = new QueryClient()

const query = createQuery(queryClient, {
  queryKey: () => ["post", id],
  queryFn: () => fetchPost(id),
  throwOnError: true,   // error propagates to errorBoundary
})

const SafePost = {
  div: PostContent,
  $: [errorBoundary({
    fallback: (error) => ({
      div: `Failed to load post: ${(error as Error).message}`,
    }),
  })],
}
```

## Logging errors

Structured error logging with context:

```ts
function logError(error: Error, context: Record<string, unknown> = {}) {
  console.error({
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  })
  // send to your error tracking service
  errorTracker?.captureException(error, { extra: context })
}
```

Use in async handlers:

```ts
async function saveForm(data: FormData) {
  try {
    await api.post("/form", data)
  } catch (err) {
    logError(err as Error, { action: "saveForm", formId: data.id })
    throw err   // re-throw so the caller can update UI
  }
}
```
