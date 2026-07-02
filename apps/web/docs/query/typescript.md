---
title: "TypeScript"
description: "Type inference, typed query keys, error types, and TypeScript-safe mutation patterns."
---

# TypeScript

## Automatic type inference

Query data types are inferred from `queryFn`'s return type — no manual annotation needed:

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"

interface User { id: string; name: string; email: string }

async function fetchUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then((r) => r.json())
}

const queryClient = new QueryClient()

const user = createQuery(queryClient, {
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
  // No type annotation needed — data is inferred as User
})

// user.data(l) → User | undefined  ✓ (correctly typed)
const name = user.data()?.name   // string | undefined
```

## Reusable query config

Define a factory function for reusable, fully-typed query configs:

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"

const queryClient = new QueryClient()

const userQuery = (id: string) => ({
  queryKey: ["user", id] as const,
  queryFn: () => fetchUser(id),
  staleTime: 60_000,
})

// Use anywhere — type is preserved
const user = createQuery(queryClient, userQuery(userId))
queryClient.prefetchQuery(userQuery(nextUserId))
queryClient.getQueryData(userQueryOptions(userId).queryKey)   // → User | undefined
```

## Typed query keys

Define query key factories for type-safe cache operations:

```ts
export const queryKeys = {
  users: {
    all:  () => ["users"] as const,
    list: (filters: UserFilters) => ["users", "list", filters] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  posts: {
    all:   () => ["posts"] as const,
    byTag: (tag: string) => ["posts", "tag", tag] as const,
  },
}

// Strongly typed invalidation
client.invalidateQueries({ queryKey: queryKeys.users.all() })
client.getQueryData<User>(queryKeys.users.detail(userId))
```

## Error types

By default, `query.error(l)` is typed as `Error | null`. Narrow to your API error type:

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"

interface ApiError {
  status: number
  message: string
  code: string
}

const queryClient = new QueryClient()

const user = createQuery<User, ApiError>(queryClient, {
  queryKey: ["user"],
  queryFn: async () => {
    const res = await fetch("/api/user")
    if (!res.ok) throw await res.json() as ApiError
    return res.json() as Promise<User>
  },
})

// user.error(l) → ApiError | null (fully typed)
const errorMsg = user.error()?.message
const statusCode = user.error()?.status
```

## Mutation types

Type the mutation variables, data, and error:

```ts
import { QueryClient } from "@domphy/query"
import { createMutation } from "@domphy/query/domphy"

interface CreatePostInput { title: string; body: string }
interface Post { id: string; title: string; body: string }

const queryClient = new QueryClient()

const createPost = createMutation<Post, ApiError, CreatePostInput>(queryClient, {
  mutationFn: (input) => api.post<Post>("/posts", input),
  onSuccess: (data) => {
    // data: Post ✓
    queryClient.setQueryData<Post[]>(["posts"], (old = []) => [...old, data])
  },
  onError: (error) => {
    // error: ApiError ✓
    console.error(error.code, error.message)
  },
})

// mutate is typed
createPost.mutate({ title: "Hello", body: "World" })
createPost.mutate({ title: 42 })   // ✗ Error: title must be string
```

## Infinite query types

```ts
import { QueryClient } from "@domphy/query"
import { createInfiniteQuery } from "@domphy/query/domphy"

interface PostPage { posts: Post[]; nextCursor: string | null }

const queryClient = new QueryClient()

const feed = createInfiniteQuery<PostPage, ApiError, PostPage, string[], string>(queryClient, {
  queryKey: ["feed"],
  queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
  initialPageParam: "",
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
})

// feed.data(l)?.pages → PostPage[]  ✓
const allPosts = feed.data()?.pages.flatMap((p) => p.posts) ?? []
```

## `QueryClient` typed methods

```ts
// Typed getQueryData
const user = client.getQueryData<User>(["user", id])   // User | undefined

// Typed setQueryData
client.setQueryData<User[]>(["users"], (old = []) => [...old, newUser])

// Typed cancelQueries
await client.cancelQueries({ queryKey: ["user"] })

// Typed invalidation with partial key matching
client.invalidateQueries({ queryKey: ["users"], exact: false })
// Invalidates ["users"], ["users", "list", ...], ["users", "detail", ...]
```

## Discriminated union for async state

When you want exhaustive type-narrowing of query states:

```ts
import type { QueryObserverResult } from "@domphy/query"

function renderQuery<T>(query: QueryObserverResult<T, Error>) {
  if (query.status === "pending") return { div: "Loading…" }
  if (query.status === "error")   return { div: `Error: ${query.error.message}` }
  // TypeScript now knows query.data: T (non-nullable)
  return renderData(query.data)
}
```

## Type-safe mutations with form

Integrate `@domphy/form` and `@domphy/query` with shared types:

```ts
import { QueryClient } from "@domphy/query"
import { createForm } from "@domphy/form/domphy"
import { createMutation } from "@domphy/query/domphy"

interface LoginInput { email: string; password: string }
interface LoginResult { token: string; user: User }

const queryClient = new QueryClient()

const loginMutation = createMutation<LoginResult, ApiError, LoginInput>(queryClient, {
  mutationFn: (input) => api.post<LoginResult>("/auth/login", input),
})

const loginForm = createForm<LoginInput>({
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value }) => {
    await loginMutation.mutateAsync(value)
    // loginMutation.data() → LoginResult (typed)
  },
})
```
