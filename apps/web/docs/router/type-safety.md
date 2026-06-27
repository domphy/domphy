---
title: "Type Safety"
description: "End-to-end TypeScript safety for route params, search params, loader data, and navigation."
---

# Type Safety

## Route params are typed

Define the expected params shape in `createRoute` — TypeScript then enforces them in loaders and components:

```ts
import { createRoute } from "@domphy/router"
import { z } from "zod"

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
  // Zod schema for path params
  params: {
    parse: (params) => ({
      postId: z.string().transform(Number).parse(params.postId),
    }),
    stringify: (params) => ({
      postId: String(params.postId),
    }),
  },
  loader: ({ params }) => {
    // params.postId: number (Zod transformed it)
    return fetchPost(params.postId)
  },
})
```

## Search params with Zod

Type and validate URL search params:

```ts
import { z } from "zod"

const SearchSchema = z.object({
  query:  z.string().default(""),
  page:   z.number().int().min(1).default(1),
  sort:   z.enum(["name", "date", "price"]).default("date"),
  filter: z.array(z.string()).default([]),
})

type SearchParams = z.infer<typeof SearchSchema>

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  validateSearch: SearchSchema.parse,
  component: (l) => {
    const match = matches.get(l).find((m) => m.routeId === searchRoute.id)
    const { query, page, sort } = match?.search as SearchParams
    // query: string, page: number, sort: "name"|"date"|"price"
    return {
      div: [
        { h1: (l) => `Results for "${query}"` },
        { p: `Page ${page}` },
      ],
    }
  },
})
```

## Typed loader data

Loader return type flows automatically into the component:

```ts
interface Post { id: number; title: string; body: string }

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
  loader: async ({ params }) => {
    // TypeScript infers the return type
    const post: Post = await fetchPost(Number(params.postId))
    return { post }
  },
  component: (l) => {
    const match = matches.get(l).find((m) => m.routeId === postRoute.id)
    const { post } = match?.loaderData as { post: Post }
    // post: Post — typed via loader return type

    return {
      article: [
        { h1: post.title },
        { p: post.body },
      ],
    }
  },
})
```

## `Link` type safety

`router.navigate()` and `Link` components are typed against the route tree:

```ts
import { createRouter } from "@domphy/router"
import type { DomphyElement } from "@domphy/core"

const router = createRouter({
  routeTree: rootRoute,
})

// TypeScript checks the destination against the route tree
const NavLink: DomphyElement<"a"> = {
  a: "Blog",
  href: router.buildLocation({ to: "/blog" }).href,
  onClick: (e) => { e.preventDefault(); router.navigate({ to: "/blog" }) },
}

// Navigate with typed params — TypeScript requires postId: string
router.navigate({
  to: "/posts/$postId",
  params: { postId: "42" },
})
```

## Route context typing

Provide a typed context to all routes:

```ts
import { createRootRouteWithContext } from "@domphy/router"

interface RouterContext {
  queryClient: QueryClient
  currentUser: User | null
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => ({ div: null }),
})

const router = createRouter({
  routeTree: rootRoute,
  context: {
    queryClient,
    currentUser: null,
  },
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: ({ context }) => {
    // context.queryClient: QueryClient — typed
    // context.currentUser: User | null — typed
    if (!context.currentUser) {
      throw redirect({ to: "/login" })
    }
  },
})
```

## Generic route utility types

```ts
import type {
  RouteById,
  RouteByPath,
  FullSearchSchema,
  AllParams,
} from "@domphy/router"

// Type of the /posts/$postId route
type PostRoute = RouteByPath<typeof router.routeTree, "/posts/$postId">

// All accumulated search params at a route
type SearchParams = FullSearchSchema<typeof router.routeTree>

// All path params across the route tree
type AllRouteParams = AllParams<typeof router.routeTree>
```

## Strict mode

Enable strict TypeScript mode for the strictest checks — `noImplicitAny`, `exactOptionalPropertyTypes`, `strictNullChecks`:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

With these settings, route code like `params.postId` is typed as `string` (not `string | undefined`) because the router guarantees param presence — no unnecessary `?.` chains needed.
