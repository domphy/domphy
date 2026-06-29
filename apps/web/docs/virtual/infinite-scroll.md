---
title: "Infinite Scroll"
description: "Implement infinite scroll by combining @domphy/virtual with @domphy/query's infinite queries."
---

# Infinite Scroll

Combine `@domphy/virtual` (virtualizer) with `@domphy/query` (infinite query) to render millions of items without DOM bloat.

## Basic setup

```ts
import { QueryClient } from "@domphy/query"
import { createVirtualizer } from "@domphy/virtual/domphy"
import { createInfiniteQuery } from "@domphy/query/domphy"
import { computed, effect } from "@domphy/core"

interface Post { id: string; title: string }
interface Page { posts: Post[]; nextCursor: string | null }

const queryClient = new QueryClient()

// Infinite query: loads pages of data
const feed = createInfiniteQuery<Page>(queryClient, {
  queryKey: () => ["feed"],
  queryFn: ({ pageParam }) => fetchPosts(pageParam as string),
  initialPageParam: "",
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
})

// Flatten pages into a single list
const allPosts = computed((): Post[] =>
  feed.data()?.pages.flatMap(p => p.posts) ?? []
)

const isFetchingMore = computed(() => feed.isFetchingNextPage())
const hasMore = computed(() => feed.hasNextPage())

// Virtualizer — count starts at 0 and is updated reactively via setOptions
const virtualizer = createVirtualizer({
  count: 0,
  estimateSize: () => 72,
})

// Keep count in sync with loaded data (+1 for the loader row when more pages exist)
effect(() => {
  virtualizer.setOptions({
    count: allPosts.get().length + (hasMore.get() ? 1 : 0),
  })
})
```

## Detecting scroll-to-bottom

Trigger `fetchNextPage()` when the last item enters the visible range:

```ts
import { effect } from "@domphy/core"

effect(() => {
  // Subscribe to virtualizer changes
  virtualizer.version()
  const items = virtualizer.virtualizer.getVirtualItems()
  if (!items.length) return

  const lastItem = items[items.length - 1]
  const total = allPosts.get().length
  const isNearEnd = lastItem.index >= total - 1

  if (isNearEnd && hasMore.get() && !isFetchingMore.get()) {
    feed.fetchNextPage()
  }
})
```

## Rendering the virtual list

```ts
import { themeColor, themeSpacing } from "@domphy/theme"

const FeedList = {
  div: [
    {
      div: (l) => {
        const items = virtualizer.getVirtualItems(l)
        const total = virtualizer.getTotalSize(l)
        const posts = allPosts.get(l)

        return {
          div: items.map(virtualItem => {
            const post = posts[virtualItem.index]
            const isLoader = !post

            return {
              _key: virtualItem.key,
              div: isLoader
                ? { div: "Loading more…", style: { paddingBlock: themeSpacing(3), textAlign: "center" } }
                : PostCard(post),
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
                height: `${virtualItem.size}px`,
              },
            }
          }),
          style: { position: "relative", height: `${total}px` },
        }
      },
    },
  ],
  style: {
    height: "600px",
    overflowY: "auto",
    position: "relative",
  },
  _onMount: (node) =>
    virtualizer.setScrollElement(node.domElement as HTMLElement),
  _onRemove: () => virtualizer.destroy(),
}
```

## Dynamic heights

If post heights vary (different content lengths), use `measureElement`:

```ts
const virtualizer = createVirtualizer({
  count: 0,
  estimateSize: () => 80,   // initial estimate
})

// In the item render, attach the measurement ref:
const PostItem = (post: Post, virtualItem: VirtualItem) => ({
  div: [
    { h3: post.title },
    { p: post.excerpt },
  ],
  _onMount: (node) =>
    virtualizer.measureElement(node.domElement as HTMLElement),
  _key: virtualItem.key,
  style: {
    position: "absolute",
    top: 0,
    transform: `translateY(${virtualItem.start}px)`,
    width: "100%",
  },
})
```

## Scroll restoration

Restore scroll position when navigating back:

```ts
import { createRoute } from "@domphy/router"

const feedRoute = createRoute({
  path: "/feed",
  // Save scroll position before leaving
  onLeave: () => {
    sessionStorage.setItem("feed-scroll", String(virtualizer.virtualizer.getScrollOffset()))
  },
  // Restore on return
  onEnter: () => {
    const saved = sessionStorage.getItem("feed-scroll")
    if (saved) {
      requestAnimationFrame(() => {
        virtualizer.scrollToOffset(Number(saved))
      })
    }
  },
})
```

## Initial data

Pre-populate the first page to avoid a loading flash:

```ts
const queryClient = new QueryClient()

const feed = createInfiniteQuery<Page>(queryClient, {
  queryKey: () => ["feed"],
  queryFn: ({ pageParam }) => fetchPosts(pageParam as string),
  initialPageParam: "",
  getNextPageParam: (page) => page.nextCursor ?? undefined,
  initialData: {
    pages: [firstPageFromSSR],
    pageParams: [""],
  },
})
```

## Scroll to top

Provide a "Back to top" button:

```ts
const BackToTop = {
  button: "↑ Back to top",
  onClick: () => virtualizer.scrollToIndex(0, { behavior: "smooth" }),
}
```
