---
title: "Infinite Scroll"
description: "Implement infinite scroll by combining @domphy/virtual with @domphy/query's infinite queries."
---

# Infinite Scroll

Combine `@domphy/virtual` (virtualizer) with `@domphy/query` (infinite query) to render millions of items without DOM bloat.

## Basic setup

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
import { createInfiniteQuery } from "@domphy/query/domphy"
import { toState, computed } from "@domphy/core"

interface Post { id: string; title: string }
interface Page { posts: Post[]; nextCursor: string | null }

// Infinite query: loads pages of data
const feed = createInfiniteQuery<Page>({
  queryKey: () => ["feed"],
  queryFn: ({ pageParam }) => fetchPosts(pageParam as string),
  initialPageParam: "",
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
})

// Flatten pages into a single list
const allPosts = computed((l): Post[] =>
  feed.data(l)?.pages.flatMap(p => p.posts) ?? []
)

const isFetchingMore = computed((l) => feed.isFetchingNextPage(l))
const hasMore = computed((l) => feed.hasNextPage(l))

// Virtualizer
const container = toState<HTMLElement | null>(null)
const virtualizer = createVirtualizer({
  count: (l) => allPosts.get(l).length + (hasMore.get(l) ? 1 : 0),   // +1 for loader row
  estimateSize: () => 72,
  getScrollElement: () => container.get(),
})
```

## Detecting scroll-to-bottom

Trigger `fetchNextPage()` when the last item is visible:

```ts
import { effect } from "@domphy/core"

effect(() => {
  const items = virtualizer.getVirtualItems()
  if (!items.length) return

  const lastItem = items[items.length - 1]
  const total = allPosts.get().length
  const isLast = lastItem.index >= total - 1

  if (isLast && hasMore.get() && !feed.isFetchingNextPage()) {
    feed.fetchNextPage()
  }
})
```

## Rendering the virtual list

```ts
const FeedList = {
  div: [
    {
      div: (l) => {
        const items = virtualizer.getVirtualItems(l)
        const total = virtualizer.getTotalSize(l)

        return {
          div: items.map(virtualItem => {
            const post = allPosts.get()[virtualItem.index]
            const isLoader = !post

            return {
              _key: virtualItem.key,
              div: isLoader
                ? { div: "Loading more…", style: { padding: "1rem", textAlign: "center" } }
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
  _onMount: (el) => container.set(el),
}
```

## Dynamic heights

If post heights vary (different content lengths), use `measureElement`:

```ts
const virtualizer = createVirtualizer({
  count: () => allPosts.get().length,
  estimateSize: () => 80,   // initial estimate
  measureElement: (el) => el.getBoundingClientRect().height,
  getScrollElement: () => container.get(),
})

// In the item render, attach the measurement ref:
const PostItem = (post: Post, virtualItem: VirtualItem) => ({
  div: [
    { h3: post.title },
    { p: post.excerpt },
  ],
  _onMount: (el) => virtualizer.measureElement(el),   // actual height replaces estimate
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
  component: () => FeedList,
  // Save scroll position before leaving
  onLeave: () => {
    sessionStorage.setItem("feed-scroll", String(container.get()?.scrollTop ?? 0))
  },
  // Restore on return
  onEnter: () => {
    const saved = sessionStorage.getItem("feed-scroll")
    if (saved) {
      requestAnimationFrame(() => {
        container.get()?.scrollTo({ top: Number(saved) })
      })
    }
  },
})
```

## Initial data

Pre-populate the first page to avoid a loading flash:

```ts
const feed = createInfiniteQuery<Page>({
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
  onClick: () => {
    container.get()?.scrollTo({ top: 0, behavior: "smooth" })
    virtualizer.scrollToIndex(0, { behavior: "smooth" })
  },
  hidden: (l) => (container.get()?.scrollTop ?? 0) < 300,
}
```
