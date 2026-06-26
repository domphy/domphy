---
title: "Testing"
description: "Test queries, mutations, and cache behavior with Vitest, mock query clients, and controlled async."
---

# Testing

## Setup

Install test dependencies:

```bash
pnpm add -D vitest @vitest/ui jsdom @testing-library/jest-dom
```

Configure Vitest:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
})
```

## Create a test QueryClient

Always use a fresh `QueryClient` per test to avoid state leaking between tests:

```ts
import { QueryClient } from "@domphy/query"
import { afterEach, beforeEach } from "vitest"

let queryClient: QueryClient

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,       // disable retries in tests — fail fast
        gcTime: Infinity,   // keep cache alive for the whole test
      },
    },
  })
  queryClient.mount()
})

afterEach(() => {
  queryClient.unmount()
  queryClient.clear()     // wipe all cached data
})
```

## Test a query with mocked fetch

```ts
import { createQuery } from "@domphy/query/domphy"
import { describe, it, expect, vi } from "vitest"

describe("createQuery", () => {
  it("fetches and stores data", async () => {
    const mockFetchUser = vi.fn().mockResolvedValue({ id: 1, name: "Alice" })

    const user = createQuery(queryClient, {
      queryKey: () => ["user", 1],
      queryFn: mockFetchUser,
    })

    // Initially pending
    expect(user.isPending()).toBe(true)

    // Wait for data
    await vi.waitFor(() => expect(user.isSuccess()).toBe(true))

    expect(user.data()).toEqual({ id: 1, name: "Alice" })
    expect(mockFetchUser).toHaveBeenCalledTimes(1)
  })
})
```

## Test error handling

```ts
it("handles fetch errors", async () => {
  const error = new Error("Network error")
  const mockFetch = vi.fn().mockRejectedValue(error)

  const query = createQuery(queryClient, {
    queryKey: () => ["fail"],
    queryFn: mockFetch,
    retry: false,
  })

  await vi.waitFor(() => expect(query.isError()).toBe(true))

  expect(query.error()).toBe(error)
})
```

## Test mutations

```ts
import { createMutation } from "@domphy/query/domphy"

it("mutation calls mutationFn and updates state", async () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: 42, name: "New post" })

  const createPost = createMutation(queryClient, {
    mutationFn: mockCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
  })

  expect(createPost.isPending()).toBe(false)

  createPost.mutate({ name: "New post" })

  await vi.waitFor(() => expect(createPost.isSuccess()).toBe(true))

  expect(mockCreate).toHaveBeenCalledWith({ name: "New post" })
  expect(createPost.data()).toEqual({ id: 42, name: "New post" })
})
```

## Pre-populate the cache for component tests

Skip the async loading phase by seeding the cache before render:

```ts
it("renders user data from cache", () => {
  // Pre-populate — no network request needed
  queryClient.setQueryData(["user", 1], { id: 1, name: "Alice" })

  const user = createQuery(queryClient, {
    queryKey: () => ["user", 1],
    queryFn: () => fetch("/api/users/1"),
    staleTime: Infinity,   // won't refetch — use cached value
  })

  expect(user.isSuccess()).toBe(true)
  expect(user.data()).toEqual({ id: 1, name: "Alice" })
})
```

## Test cache invalidation

```ts
it("invalidates and refetches after mutation", async () => {
  const mockFetch = vi.fn()
    .mockResolvedValueOnce([{ id: 1, text: "Todo 1" }])   // first fetch
    .mockResolvedValueOnce([{ id: 1, text: "Todo 1" }, { id: 2, text: "Todo 2" }])   // after create

  const todos = createQuery(queryClient, {
    queryKey: () => ["todos"],
    queryFn: mockFetch,
  })

  await vi.waitFor(() => expect(todos.isSuccess()).toBe(true))
  expect(todos.data()).toHaveLength(1)

  const createTodo = createMutation(queryClient, {
    mutationFn: vi.fn().mockResolvedValue({ id: 2, text: "Todo 2" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  })

  createTodo.mutate({ text: "Todo 2" })

  await vi.waitFor(() => expect(todos.data()).toHaveLength(2))
  expect(mockFetch).toHaveBeenCalledTimes(2)
})
```

## Testing with fake timers

For polling and staleTime tests, use Vitest's fake timers:

```ts
import { vi, beforeEach, afterEach } from "vitest"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it("refetches every 5 seconds", async () => {
  const mockFetch = vi.fn().mockResolvedValue("data")

  const query = createQuery(queryClient, {
    queryKey: () => ["polling"],
    queryFn: mockFetch,
    refetchInterval: 5_000,
  })

  await vi.waitFor(() => expect(query.isSuccess()).toBe(true))
  expect(mockFetch).toHaveBeenCalledTimes(1)

  // Advance 5 seconds
  await vi.advanceTimersByTimeAsync(5_000)
  expect(mockFetch).toHaveBeenCalledTimes(2)

  // Another 5 seconds
  await vi.advanceTimersByTimeAsync(5_000)
  expect(mockFetch).toHaveBeenCalledTimes(3)
})
```

## Testing with MSW (Mock Service Worker)

For integration-level tests that go through actual fetch:

```ts
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"

const server = setupServer(
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, name: "Alice" })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("fetches user from API", async () => {
  const user = createQuery(queryClient, {
    queryKey: () => ["user", "1"],
    queryFn: () => fetch("/api/users/1").then(r => r.json()),
  })

  await vi.waitFor(() => expect(user.isSuccess()).toBe(true))
  expect(user.data()).toEqual({ id: "1", name: "Alice" })
})
```
