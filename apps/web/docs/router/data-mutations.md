---
title: "Data Mutations"
description: "Perform mutations in route loaders, handle optimistic updates, and coordinate server actions with router state."
---

# Data Mutations

## Mutations with `@domphy/query`

The most common pattern: perform mutations using `createMutation` from `@domphy/query`, then invalidate the relevant queries to reflect the updated state:

```ts
import { QueryClient } from "@domphy/query"
import { createMutation } from "@domphy/query/domphy"

const queryClient = new QueryClient()

const createPost = createMutation(queryClient, {
  mutationFn: (data: PostInput) => api.post("/posts", data),
  onSuccess: (post) => {
    // Invalidate the posts list — it will refetch automatically
    queryClient.invalidateQueries({ queryKey: ["posts"] })
    router.navigate({ to: `/posts/${post.id}` })
  },
})
```

## Route action pattern

For form submissions that navigate after success, use a route-level action:

```ts
import { createRoute } from "@domphy/router"
import { createForm } from "@domphy/form/domphy"

const newPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/new",
  component: () => {
    const form = createForm<PostInput>({
      defaultValues: { title: "", body: "" },
      onSubmit: async ({ value }) => {
        const post = await api.post("/posts", value)
        // Navigate after successful creation
        router.navigate({ to: `/posts/${post.id}` })
      },
    })

    return {
      form: [
        // form fields...
        {
          button: (l) => form.isSubmitting(l) ? "Creating…" : "Create post",
          type: "submit",
          disabled: (l) => !form.canSubmit(l),
        },
      ],
      onSubmit: (e: Event) => { e.preventDefault(); form.handleSubmit() },
    }
  },
})
```

## Optimistic mutations

Update the cache immediately, then revert if the server request fails:

```ts
import { QueryClient } from "@domphy/query"
import { createMutation } from "@domphy/query/domphy"

interface Todo { id: string; text: string; done: boolean }

const queryClient = new QueryClient()

const toggleTodo = createMutation(queryClient, {
  mutationFn: (id: string) => api.patch(`/todos/${id}/toggle`),

  onMutate: async (id) => {
    // Cancel any in-flight refetches
    await queryClient.cancelQueries({ queryKey: ["todos"] })

    // Snapshot the current state
    const previous = queryClient.getQueryData<Todo[]>(["todos"])

    // Optimistically update the cache
    queryClient.setQueryData<Todo[]>(["todos"], (todos = []) =>
      todos.map((t) => t.id === id ? { ...t, done: !t.done } : t)
    )

    return { previous }
  },

  onError: (_err, _id, context) => {
    // Revert on error
    queryClient.setQueryData(["todos"], context?.previous)
  },

  onSettled: () => {
    // Always refetch after success or error to ensure consistency
    queryClient.invalidateQueries({ queryKey: ["todos"] })
  },
})
```

## Mutation state in the UI

```ts
const TodoItem = (todo: Todo) => ({
  li: [
    {
      input: null,
      type: "checkbox",
      checked: todo.done,
      disabled: (l) => toggleTodo.isPending(l),
      onChange: () => toggleTodo.mutate(todo.id),
    },
    { span: todo.text },
    {
      span: "Saving…",
      hidden: (l) => !toggleTodo.isPending(l),
      style: { fontSize: "0.75rem", opacity: 0.6 },
    },
  ],
})
```

## Mutation + route loader coordination

After a mutation, reload the route's loader data to reflect the change:

```ts
const queryClient = new QueryClient()

const deletePost = createMutation(queryClient, {
  mutationFn: (id: string) => api.delete(`/posts/${id}`),
  onSuccess: async () => {
    // Invalidate the query cache
    await queryClient.invalidateQueries({ queryKey: ["posts"] })
    // Navigate to the list (the list route's loader will refetch)
    router.navigate({ to: "/posts" })
  },
})
```

Or, if you're using route loaders (not `@domphy/query`), force the current route to reload:

```ts
const queryClient = new QueryClient()

const deletePost = createMutation(queryClient, {
  mutationFn: (id: string) => api.delete(`/posts/${id}`),
  onSuccess: async () => {
    // Force the route to reload its loader
    await router.invalidate()
    router.navigate({ to: "/posts" })
  },
})
```

`router.invalidate()` marks all route loaders as stale and re-runs them on the next render.

## Pending mutations

Track all in-flight mutations by subscribing to the `MutationCache`:

```ts
import { QueryClient } from "@domphy/query"
import { toState } from "@domphy/core"

const queryClient = new QueryClient()
const mutatingCount = toState(0)

queryClient.getMutationCache().subscribe(() => {
  mutatingCount.set(queryClient.isMutating())
})

const SaveIndicator = {
  div: "Saving…",
  hidden: (l) => mutatingCount.get(l) === 0,
}
```

## Global mutation callbacks

Register callbacks on the `QueryClient` to handle all mutations centrally (e.g., show toast notifications):

```ts
import { QueryClient, MutationCache } from "@domphy/query"

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(`Operation failed: ${error.message}`)
    },
    onSuccess: () => {
      toast.success("Saved")
    },
  }),
})
```

## Error handling

```ts
const queryClient = new QueryClient()

const saveForm = createMutation(queryClient, {
  mutationFn: submitFormData,
  onError: (error: ApiError) => {
    if (error.status === 422) {
      // Validation error — display field errors
      error.fields?.forEach(({ field, message }) => {
        form.form.setFieldMeta(field, (meta) => ({
          ...meta,
          errors: [message],
        }))
      })
    } else {
      // Unexpected error — show generic toast
      toast.error("Something went wrong. Please try again.")
    }
  },
})
```
