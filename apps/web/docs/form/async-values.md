---
title: "Async Initial Values"
description: "Load initial form values from an API, handle loading states, and reset when data changes."
---

# Async Initial Values

## Problem: forms need server data

A common pattern — edit a resource fetched from the API. The form must not initialize until the data arrives, and it should reset if the resource changes (e.g. route param changes).

## Pattern 1: conditional render

Don't create the form until data is ready — the simplest approach:

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"
import { createForm } from "@domphy/form/domphy"

const queryClient = new QueryClient()

const postQuery = createQuery(queryClient, {
  queryKey: () => ["post", postId],
  queryFn: () => fetchPost(postId),
})

const EditPage = {
  div: (l) => {
    if (postQuery.isPending(l)) return { div: "Loading…" }
    if (postQuery.isError(l))   return { div: "Failed to load post" }

    // Only create form when data is ready — defaultValues are set exactly once
    return EditForm(postQuery.data(l)!)
  },
}

function EditForm(post: Post) {
  const form = createForm<PostInput>({
    defaultValues: {
      title: post.title,
      body: post.body,
    },
    onSubmit: async ({ value }) => {
      await api.patch(`/posts/${post.id}`, value)
    },
  })

  return FormElement(form)
}
```

This is reliable — the form is created fresh when data arrives, with the correct defaults.

## Pattern 2: reset on data change

Create the form immediately (with empty defaults), then reset when data loads:

```ts
import { effect } from "@domphy/core"

const form = createForm<PostInput>({
  defaultValues: { title: "", body: "" },
  onSubmit: async ({ value }) => api.patch(`/posts/${postId}`, value),
})

// Reset form when the query data changes (e.g. navigating to a different post)
effect(() => {
  const post = postQuery.data()
  if (post) {
    form.form.reset({ title: post.title, body: post.body })
  }
})
```

`form.form.reset(values)` sets all field values to `values` and resets touched/dirty state.

## Pattern 3: async defaultValues

Pass a function as `defaultValues` — called once at mount:

```ts
const form = createForm<PostInput>({
  defaultValues: async () => {
    const post = await fetchPost(postId)
    return { title: post.title, body: post.body }
  },
  onSubmit: async ({ value }) => api.patch(`/posts/${postId}`, value),
})

// form.state.isLoading is true while defaultValues is resolving
const FormOrLoader = {
  div: (l) => form.isLoading(l)
    ? { div: "Loading…" }
    : FormElement,
}
```

This keeps loading logic inside the form itself — no external query needed for this pattern.

## Reset on route change

When the route changes (different `postId`), reset the form with fresh data:

```ts
import { createRoute } from "@domphy/router"

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId/edit",
  loader: ({ params }) => fetchPost(Number(params.postId)),
  component: (l) => {
    const match = matches.get(l).find((m) => m.routeId === editRoute.id)
    const post = match?.loaderData as Post

    const form = createForm<PostInput>({
      defaultValues: { title: post.title, body: post.body },
      onSubmit: async ({ value }) => api.patch(`/posts/${post.id}`, value),
    })

    return FormElement(form)
  },
})
```

Because `component` re-runs when the route params change (and therefore `post` changes), the form always initializes with the current post's values.

## Detecting form dirtiness

Show a "You have unsaved changes" warning only when the user has modified the form from its initial values:

```ts
const UnsavedBanner = {
  div: "You have unsaved changes.",
  hidden: (l) => !form.isDirty(l),
  style: {
    padding: "8px 16px",
    background: "var(--warning-3)",
    color: "var(--warning-11)",
    borderRadius: "4px",
  },
}

const SaveButton = {
  button: (l) => form.isSubmitting(l) ? "Saving…" : "Save",
  type: "submit",
  disabled: (l) => !form.isDirty(l) || !form.canSubmit(l),
}
```

## Optimistic reset after save

After a successful save, reset the form so `isDirty` is false and the user sees a clean state:

```ts
const form = createForm<PostInput>({
  defaultValues: { title: post.title, body: post.body },
  onSubmit: async ({ value, formApi }) => {
    const updated = await api.patch(`/posts/${post.id}`, value)
    // Reset with the server's canonical values (may differ from what was submitted)
    formApi.reset({ title: updated.title, body: updated.body })
  },
})
```

## Multi-step forms with async steps

Load data for each step only when the user reaches it:

```ts
import { toState } from "@domphy/core"

const step = toState<"account" | "profile" | "review">("account")
const profileData = toState<ProfileData | null>(null)

const WizardForm = {
  div: (l) => {
    switch (step.get(l)) {
      case "account":
        return AccountStep
      case "profile":
        if (!profileData.get(l)) {
          fetchProfileSuggestions().then(data => profileData.set(data))
          return { div: "Loading profile suggestions…" }
        }
        return ProfileStep(profileData.get(l)!)
      case "review":
        return ReviewStep
    }
  },
}
```
