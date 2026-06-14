# Search Params

The router treats the query string as structured, validated, typed state — not a bag of strings. Search params are parsed (with JSON support for nested values), validated per route, and flow into matches and loaders fully typed.

## `validateSearch`

Declare a route's search schema with `validateSearch`. The raw parsed search comes in, your typed schema comes out:

```ts
type PostsSearch = {
    page: number
    filter: string
}

const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts",
    validateSearch: (search: Record<string, unknown>): PostsSearch => ({
        page: Number(search.page ?? 1),
        filter: (search.filter as string) ?? "",
    }),
})
```

Any [Standard Schema](https://github.com/standard-schema/standard-schema) validator (Zod, Valibot, ArkType...) can be passed directly instead of a function:

```ts
validateSearch: z.object({
    page: z.number().catch(1),
    filter: z.string().catch(""),
})
```

If validation throws, the match errors with a `SearchParamError` — surface it from `match.status === "error"` / `match.error`.

## Reading Search

The validated result lives on the match (parent schemas are merged in):

```ts
const match = matches.get(l).find((m) => m.routeId === postsRoute.id)
match?.search.page   // number — typed by validateSearch
```

And in loaders — but go through `loaderDeps`, not `search` directly (see [Data Loading](./data-loading)):

```ts
loaderDeps: ({ search }) => ({ page: search.page }),
loader: ({ deps }) => fetchPosts(deps.page),
```

## Navigating With Search

`search` accepts an object, `true` to keep the current params, or an updater function — the functional form is the idiomatic one for "change one param, keep the rest":

```ts
router.navigate({ to: "/posts", search: { page: 2, filter: "" } })

// update relative to the current search
router.navigate({
    to: ".",
    search: (prev) => ({ ...prev, page: prev.page + 1 }),
})

// different route, keep whatever search is currently in the URL
router.navigate({ to: "/posts", search: true })
```

The same `search` option works in `buildLocation` for hrefs and in `redirect()`.

## Search Middleware

Middlewares run on every *link build and navigation* for a route, transforming the outgoing search before it hits the URL. They are declared on the route's `search.middlewares`:

```ts
import { retainSearchParams, stripSearchParams } from "@domphy/router"
```

### `retainSearchParams`

Keeps search params alive across navigations that would otherwise drop them — for app-wide params like feature flags or an active workspace:

```ts
const rootRoute = createRootRoute({
    validateSearch: (search: Record<string, unknown>) => ({
        workspace: (search.workspace as string) ?? undefined,
    }),
    search: {
        middlewares: [retainSearchParams(["workspace"])],
    },
})
```

`retainSearchParams(true)` retains everything currently in the URL.

### `stripSearchParams`

Removes noise from URLs — params equal to their defaults disappear:

```ts
const defaults = { page: 1, filter: "" }

const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts",
    validateSearch: (search: Record<string, unknown>) => ({
        page: Number(search.page ?? defaults.page),
        filter: (search.filter as string) ?? defaults.filter,
    }),
    search: {
        middlewares: [stripSearchParams(defaults)],
    },
})
```

`/posts?page=1&filter=` becomes `/posts`. Variants: pass an array of keys to always strip them, or `true` to strip all (only when no search params are required).

## Custom Serialization

By default search is serialized with `defaultStringifySearch` (JSON-aware: `?ids=[1,2]` round-trips as an array). Swap the codec router-wide:

```ts
import { createRouter, parseSearchWith, stringifySearchWith } from "@domphy/router"

const router = createRouter({
    routeTree,
    history,
    parseSearch: parseSearchWith(JSON.parse),
    stringifySearch: stringifySearchWith(JSON.stringify),
})
```
