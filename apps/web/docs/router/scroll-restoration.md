---
title: "Scroll Restoration"
description: "Restore scroll position on navigation, per-route scroll behavior, and hash-link scrolling."
---

# Scroll Restoration

## Default behavior

`@domphy/router` does not automatically restore scroll position — scroll behavior is explicit and composable. The most common setup scrolls to the top on every navigation:

```ts
import { createRouter } from "@domphy/router"

const router = createRouter({
  routeTree,
  scrollRestoration: false,   // manual control (default)
})

// Scroll to top on route change
router.subscribe("onBeforeNavigate", () => {
  window.scrollTo({ top: 0, behavior: "instant" })
})
```

## Scroll restoration on back/forward

Save the scroll position before leaving a route, restore it when returning:

```ts
const SCROLL_KEY = "router-scroll-positions"

function saveScroll(key: string) {
  const positions = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "{}")
  positions[key] = window.scrollY
  sessionStorage.setItem(SCROLL_KEY, JSON.stringify(positions))
}

function restoreScroll(key: string): boolean {
  const positions = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "{}")
  const saved = positions[key]
  if (saved != null) {
    requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "instant" }))
    return true
  }
  return false
}

router.subscribe("onBeforeNavigate", ({ toLocation, fromLocation }) => {
  if (fromLocation?.pathname) {
    saveScroll(fromLocation.pathname)
  }
})

router.subscribe("onResolved", ({ toLocation }) => {
  // If a position was saved for this path, restore it (back/forward).
  // Otherwise this is a fresh push — scroll to top.
  restoreScroll(toLocation.pathname) || window.scrollTo({ top: 0, behavior: "instant" })
})
```

## Per-route scroll behavior

Override scroll for specific routes:

```ts
const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
  // Scroll to top when entering any post
  onEnter: () => window.scrollTo({ top: 0 }),
})

const commentsRoute = createRoute({
  getParentRoute: () => postRoute,
  path: "comments",
  // Scroll to the comments section
  onEnter: () => {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })
  },
})
```

## Hash link scrolling

Scroll to an element when the URL has a `#anchor`:

```ts
router.subscribe("onResolved", ({ toLocation }) => {
  const hash = toLocation.hash
  if (hash) {
    // Wait for DOM to render before scrolling
    requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1))
      target?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  } else {
    window.scrollTo({ top: 0, behavior: "instant" })
  }
})
```

Link to a specific section using the standard link pattern:

```ts
import type { DomphyElement } from "@domphy/core"

const ApiLink: DomphyElement<"a"> = {
  a: "API Reference",
  href: router.buildLocation({ to: "/docs/core/", hash: "#api-reference" }).href,
  onClick: (e) => {
    e.preventDefault()
    router.navigate({ to: "/docs/core/", hash: "#api-reference" })
  },
}
```

## Infinite scroll with virtual list — scroll restoration

For pages with a virtual infinite scroll list, save/restore the scroll offset of the container element:

```ts
import { toState } from "@domphy/core"
import { createRoute } from "@domphy/router"

const feedContainer = toState<HTMLElement | null>(null)

const feedRoute = createRoute({
  path: "/feed",
  onLeave: () => {
    const el = feedContainer.get()
    if (el) sessionStorage.setItem("feed-scroll", String(el.scrollTop))
  },
  onEnter: () => {
    requestAnimationFrame(() => {
      const el = feedContainer.get()
      const saved = sessionStorage.getItem("feed-scroll")
      if (el && saved) el.scrollTop = Number(saved)
    })
  },
})
```

## Blocking scroll during transitions

For page transitions (fade/slide), prevent scroll jump mid-animation:

```ts
import { toState } from "@domphy/core"

const isTransitioning = toState(false)

router.subscribe("onBeforeNavigate", () => {
  isTransitioning.set(true)
  document.body.style.overflow = "hidden"
})

router.subscribe("onResolved", () => {
  setTimeout(() => {
    isTransitioning.set(false)
    document.body.style.overflow = ""
    window.scrollTo({ top: 0, behavior: "instant" })
  }, 300)   // match your CSS transition duration
})
```

## Route-level scroll position API

| Method | Description |
|--------|-------------|
| `router.subscribe("onBeforeNavigate", fn)` | Fires before navigation starts |
| `router.subscribe("onResolved", fn)` | Fires after navigation and loaders settle |
| `toLocation.hash` | URL hash (`"#section"` or `""`) |
| `fromLocation?.pathname` | Previous pathname (available in `onBeforeNavigate`) |
