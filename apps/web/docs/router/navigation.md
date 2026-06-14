# Navigation

All navigation goes through the router — it matches the destination, runs loaders, and commits the new location to history. The UI never touches `window.location`.

## `router.navigate`

```ts
await router.navigate({ to: "/posts" })
await router.navigate({ to: "/posts/$postId", params: { postId: "42" } })
await router.navigate({ to: "/posts", search: { page: 2 } })
await router.navigate({ to: "/login", replace: true })   // no history entry
await router.navigate({ to: ".", search: (prev) => ({ ...prev, page: 2 }) }) // stay, update search
```

Common options:

| Option | Meaning |
|---|---|
| `to` | Destination path. Param segments stay literal (`"/posts/$postId"`); values go in `params`. |
| `params` | Path param values, or an updater `(prev) => next`. |
| `search` | Search params object, updater function, or `true` to keep current. |
| `hash` | Hash string or updater. |
| `state` | Custom history state (survives back/forward). |
| `from` | Resolve `to` relative to this path — enables `to: ".."` and `to: "./details"`. |
| `replace` | Replace instead of push. |
| `reloadDocument` | Full document navigation instead of client-side. |
| `ignoreBlocker` | Skip navigation blockers. |

`navigate` returns a promise that resolves when the navigation (including loaders) settles.

## Building Hrefs

`router.buildLocation` resolves any navigate options into a `ParsedLocation` without navigating — the way to get real `href`s for `<a>` elements:

```ts
const location = router.buildLocation({ to: "/posts/$postId", params: { postId: "42" } })
location.href     // "/posts/42"
location.pathname // "/posts/42"
```

## The Domphy Link Pattern

A real anchor with a real href, click intercepted for client-side navigation:

```ts
import type { DomphyElement } from "@domphy/core"

const link = (to: string, label: string): DomphyElement<"a"> => ({
    a: label,
    href: router.buildLocation({ to }).href,
    onClick: (e) => {
        e.preventDefault()
        router.navigate({ to })
    },
})
```

This keeps middle-click, copy-link, and crawlers working, because the `href` is genuine.

## Active Links

Bridge the current pathname into a state, then mark the active link with a data attribute and style it via a nested selector:

```ts
import { toState } from "@domphy/core"

const pathname = toState(router.state.location.pathname)
router.subscribe("onResolved", () => pathname.set(router.state.location.pathname))

const navLink = (to: string, label: string): DomphyElement<"a"> => ({
    a: label,
    href: router.buildLocation({ to }).href,
    dataActive: (l) => (pathname.get(l) === to ? "true" : "false"),
    onClick: (e) => {
        e.preventDefault()
        router.navigate({ to })
    },
    style: {
        '&[data-active="true"]': { textDecoration: "underline" },
    },
})
```

For prefix matching (e.g. `/posts` active on `/posts/42`), use `pathname.get(l).startsWith(to)`, or ask the router: `router.matchRoute({ to }, { fuzzy: true })`.

## History Types

The history decides how locations map to the address bar. All three are re-exported from `@tanstack/history`:

```ts
import { createBrowserHistory, createHashHistory, createMemoryHistory } from "@domphy/router"

createBrowserHistory()                                  // normal URLs — needs server rewrites to index.html
createHashHistory()                                     // /#/posts/42 — static hosts, no server config
createMemoryHistory({ initialEntries: ["/posts/42"] })  // no URL at all — SSR, tests, embedded demos
```

The history object is also the imperative back/forward API:

```ts
router.history.back()
router.history.forward()
router.history.go(-2)
```

## Blocking Navigation

Block navigation away from unsaved work with `history.block`. The blocker function decides per navigation; `enableBeforeUnload` extends the guard to tab close:

```ts
const unblock = router.history.block({
    blockerFn: async ({ nextLocation }) => {
        if (!formIsDirty.get()) return true
        return window.confirm(`Discard changes and go to ${nextLocation.pathname}?`)
    },
    enableBeforeUnload: () => formIsDirty.get(),
})

// later, when the form is saved
unblock()
```

A navigation called with `ignoreBlocker: true` bypasses blockers.

## Router Events

`router.subscribe` covers the full navigation lifecycle — each returns an unsubscribe function:

| Event | When |
|---|---|
| `onBeforeNavigate` | Navigation accepted, before anything loads |
| `onBeforeLoad` | Location committed, loaders about to run |
| `onLoad` | Loaders running for the new matches |
| `onResolved` | Navigation fully settled — **the one to bridge UI state from** |

Each event carries `fromLocation`, `toLocation`, and `pathChanged` / `hrefChanged` flags. Two more events exist for framework adapters (`onBeforeRouteMount`, `onRendered`) — plain Domphy apps rarely need them.
