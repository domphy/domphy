# Layouts & Boundaries

## Nested Layouts

A `layout` wraps everything below its segment, exactly like `layout.tsx` wraps `page.tsx` and child segments. Layouts receive the wrapped subtree and the route context:

```ts
const routes = defineRoutes([
  {
    path: "/",
    layout: (children) => ({ div: [Header(), children, Footer()] }),
    page: HomePage,
    children: [
      {
        path: "docs",
        layout: (children) => ({ div: [Sidebar(), children] }),
        page: DocsIndexPage,
        children: [{ path: "[...parts]", page: DocsPage }],
      },
    ],
  },
])
```

Navigating from `/docs/a` to `/docs/b` re-renders only the page; both layouts keep their DOM. The router keys every layout with its segment id, so Domphy's child diffing reuses the existing nodes.

## Loading UI

`loading` is the `loading.tsx` equivalent. While the segment's loader (or any descendant's) is pending, the nearest loading block renders in place of the subtree; ancestor layouts stay on screen:

```ts
{
  path: "blog/[slug]",
  loader: ({ params }) => fetchPost(params.slug as string),
  loading: () => ({ p: "Loading post..." }),
  page: PostPage,
}
```

Without a loading block anywhere in the matched chain, the previous page stays visible until data resolves — the same default as Next.js.

## Error Boundaries

`error` is the `error.tsx` equivalent. When a segment's loader throws, the nearest error block at or above that segment renders, wrapped in the ancestor layouts. It receives the error and a `retry` function (which calls `router.refresh()`):

```ts
{
  path: "/",
  error: (error, retry) => ({
    div: [
      { h2: "Something went wrong" },
      { p: error.message },
      { button: "Try again", onClick: () => retry() },
    ],
  }),
  ...
}
```

An app-level fallback can be passed to `createApp(routes, { error })` — the `global-error.tsx` equivalent.

## Not Found

`notFound` is the `not-found.tsx` equivalent. It renders when:

- no route matches the URL (the app-level `createApp(routes, { notFound })` block, falling back to a built-in 404), or
- a loader, metadata function or middleware calls `notFound()` — then the nearest segment-level block renders inside the ancestor layouts.

```ts
import { notFound } from "@domphy/app"

{
  path: "blog/[slug]",
  loader: async ({ params }) => {
    const post = await fetchPost(params.slug as string)
    if (!post) notFound()
    return post
  },
  notFound: () => ({ h2: "Post not found" }),
  page: PostPage,
}
```

`router.state.get("status")` reports `"notfound"`, and `renderToString` returns HTTP status `404`.
