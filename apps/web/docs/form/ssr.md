---
title: "SSR & Hydration"
description: "Use @domphy/form with server-side rendering: pre-populate forms from loader data, use mergeForm for server validation errors, and pattern with @domphy/app."
---

# SSR & Hydration

## Why forms are SSR-safe

`@domphy/form` holds all state in JavaScript — it writes nothing to the HTML. A server-rendered form is just static HTML with empty inputs; the form state initializes on the client when `createForm()` runs. No hydration mismatch is possible.

The SSR challenge is different: **how to pre-populate forms with server data** and **how to surface server validation errors without a full round-trip**.

## Pattern 1: pre-populate from a loader

The simplest approach with `@domphy/app` — load the data in the route loader and pass it to the form as `defaultValues`:

```ts
import { createRoute } from "@domphy/router"
import { createForm } from "@domphy/form/domphy"
import { inputText, label, formGroup, button } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

interface Post {
  id: number
  title: string
  body: string
}

// Route loader fetches the post server-side (or client-side, depending on your setup)
const editPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId/edit",
  loader: ({ params }) => fetchPost(Number(params.postId)),
  component: EditPost,
})

function EditPost() {
  const post = editPostRoute.useLoaderData() as Post

  const form = createForm<{ title: string; body: string }>({
    defaultValues: { title: post.title, body: post.body },
    onSubmit: async ({ value }) => {
      await api.patch(`/posts/${post.id}`, value)
    },
  })

  const titleField = form.field<string>("title", {
    validators: { onChange: ({ value }) => value ? undefined : "Title required" },
  })
  const bodyField = form.field<string>("body", {
    validators: { onChange: ({ value }) => value ? undefined : "Body required" },
  })

  return {
    form: [
      {
        fieldset: [
          { label: "Title", $: [label()] },
          {
            input: null,
            type: "text",
            $: [inputText()],
            value: (l) => titleField.value(l),
            onInput: (e) => titleField.handleChange((e.target as HTMLInputElement).value),
            onBlur: () => titleField.handleBlur(),
          },
          {
            p: (l) => String(titleField.errors(l)[0] ?? ""),
            hidden: (l) => titleField.errors(l).length === 0,
          },
        ],
        $: [formGroup({ layout: "vertical" })],
      },
      {
        button: (l) => form.isSubmitting(l) ? "Saving…" : "Save",
        type: "submit",
        $: [button({ color: "primary" })],
        disabled: (l) => !form.canSubmit(l),
      },
    ],
    onSubmit: (e) => { (e as Event).preventDefault(); form.handleSubmit() },
    _onRemove: () => form.destroy(),
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(3),
      maxWidth: themeSpacing(100),
    },
  }
}
```

Because the route re-runs `component` when the loader data changes (e.g. navigating to a different post), the form always initializes with the current post's values.

## Pattern 2: `mergeForm()` for server validation errors

When you submit a form via a traditional `<form action>` POST (no JavaScript), the server can validate the data and return error state. `mergeForm()` merges that server state into the client form so errors are immediately visible on hydration:

```ts
import { mergeForm } from "@domphy/form"
import { createForm } from "@domphy/form/domphy"

// Server returns partial FormState alongside the page HTML
// (e.g. as a <script> tag: `window.__FORM_STATE__ = ...`)
declare const serverFormState: {
  values: { email: string; name: string }
  fieldMeta?: Record<string, { errorMap?: Record<string, unknown> }>
}

const form = createForm<{ email: string; name: string }>({
  defaultValues: { email: "", name: "" },
  onSubmit: async ({ value }) => submitForm(value),
})

// Merge server state before rendering — sets field values and errors
if (serverFormState) {
  mergeForm(form.form, serverFormState)
}

const emailField = form.field<string>("email", {
  validators: {
    onChange: ({ value }) => value.includes("@") ? undefined : "Invalid email",
  },
})
```

After `mergeForm()`, the form starts with the submitted values filled in and any server-side errors pre-populated — the user sees their mistakes without retyping.

## Pattern 3: transform for SSR

The `transform` option on `FormOptions` applies a transformation to the initial state — useful for mapping server payloads into form state format:

```ts
const form = createForm<{ title: string }>({
  defaultValues: { title: "" },
  transform: (data) => {
    // data.state is the current BaseFormState
    // Return a modified state object
    return {
      state: {
        ...(data as any).state,
        values: serverPayload.values,
      },
    }
  },
  onSubmit: ({ value }) => save(value),
})
```

`transform` runs once during `FormApi` construction and only affects the initial state. Subsequent updates do not re-run it.

## Serializing form state on the server

If your server runs JavaScript (Node.js / Deno), you can pre-run form validation server-side and serialize the state:

```ts
// server-side handler (Node.js)
import { FormApi } from "@domphy/form"

async function handlePost(req: Request) {
  const body = await req.json()

  // Run validation on the server
  const serverForm = new FormApi<{ email: string }>({
    defaultValues: body as { email: string },
    validators: {
      onSubmit: ({ value }) =>
        value.email.includes("@") ? undefined : "Invalid email",
    },
  })
  serverForm.mount()
  await serverForm.validateAllFields("submit")

  const state = serverForm.store.state
  const isValid = state.isValid

  if (isValid) {
    await saveToDatabase(state.values)
    return redirect("/success")
  }

  // Return form state as JSON embedded in the HTML response
  return renderPage({
    formState: {
      values: state.values,
      fieldMeta: state.fieldMeta,
    },
  })
}
```

On the client, pick up `formState` from the page and call `mergeForm()` before mounting.

## Handling loading states

When `defaultValues` come from an async source, show a skeleton while data loads:

```ts
import { createQuery } from "@domphy/query/domphy"
import { skeleton } from "@domphy/ui"

const postQuery = createQuery(queryClient, {
  queryKey: () => ["post", postId],
  queryFn: () => fetchPost(postId),
})

const EditPageShell = {
  div: (l) => {
    if (postQuery.isPending(l)) {
      return {
        div: [
          { div: null, $: [skeleton()], style: { height: themeSpacing(8), marginBottom: themeSpacing(2) } },
          { div: null, $: [skeleton()], style: { height: themeSpacing(24) } },
        ],
      }
    }
    if (postQuery.isError(l)) {
      return { p: "Failed to load post." }
    }
    return EditForm(postQuery.data(l)!)
  },
}

function EditForm(post: Post) {
  // Form is created fresh once data is available — correct defaults guaranteed
  const form = createForm<{ title: string; body: string }>({
    defaultValues: { title: post.title, body: post.body },
    onSubmit: async ({ value }) => api.patch(`/posts/${post.id}`, value),
  })
  // ... fields and UI
}
```

Creating the form inside the conditional guard ensures it initializes with real data, never with empty defaults.

## `_onRemove` cleanup is required

Always destroy the form when the component unmounts. In SSR setups, component trees can be created and discarded rapidly — leaving forms mounted leaks devtools subscriptions:

```ts
{
  form: [ /* ... */ ],
  _onRemove: () => form.destroy(),
}
```
