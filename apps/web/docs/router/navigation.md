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

`linkProps(router, options)` returns the `href` + `onClick` pair for an anchor that navigates through the router. Spread it into an `{ a: ... }` element:

```ts
import type { DomphyElement } from "@domphy/core"
import { linkProps } from "@domphy/router"

const link = (to: string, label: string): DomphyElement<"a"> => ({
    a: label,
    ...linkProps(router, { to }),
})
```

The `href` is genuine, so copy-link, crawlers and "open in new tab" all work. The click handler deliberately does **not** intercept when the browser should handle the click itself:

| Left alone | Why |
|---|---|
| Ctrl / Cmd / Shift / Alt click | opens in a new tab/window, or downloads |
| Any non-primary button | middle-click paste/new-tab, context menu |
| `target` other than `_self` | the anchor targets another browsing context |
| An already `preventDefault()`ed event | an outer handler already claimed the click |

Everything else is intercepted with `preventDefault()` and routed client-side. Hand-rolling `onClick: (e) => { e.preventDefault(); router.navigate({ to }) }` silently breaks the first three rows.

`linkProps` accepts the full `NavigateOptions` set (`params`, `search`, `hash`, `from`, `mask`, `replace`, …) plus `target` and `disabled`. A masked destination shows the masked href while navigating to the real one. A `to` written as an absolute URL (`https://…`, `mailto:…`) renders as a plain external link with no click interception. If its protocol is outside `router.protocolAllowlist`, the link renders inert — no `href`, no `onClick`, plus `role="link"` and `ariaDisabled: true` — which is exactly what `disabled: true` returns.

## Active Links

Bridge the current pathname into a state, then mark the active link with a data attribute and style it via a nested selector:

```ts
import { toState } from "@domphy/core"
import { linkProps } from "@domphy/router"

const pathname = toState(router.state.location.pathname)
router.subscribe("onResolved", () => pathname.set(router.state.location.pathname))

const navLink = (to: string, label: string): DomphyElement<"a"> => ({
    a: label,
    ...linkProps(router, { to }),
    dataActive: (l) => (pathname.get(l) === to ? "true" : "false"),
    style: {
        '&[data-active="true"]': { textDecoration: "underline" },
    },
})
```

For prefix matching (e.g. `/posts` active on `/posts/42`), use `pathname.get(l).startsWith(to)`, or ask the router: `router.matchRoute({ to }, { fuzzy: true })`.

## History Types

The history decides how locations map to the address bar. All three are available from `@domphy/router`:

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
| `onResolved` | Navigation fully settled |

Each event carries `fromLocation`, `toLocation`, and `pathChanged` / `hrefChanged` flags. Two more events exist for framework adapters (`onBeforeRouteMount`, `onRendered`) — plain Domphy apps rarely need them.

## Bridging Router State

Events report *milestones*, not every state change: none of them fires at the moment `status` flips to `"pending"` — `onBeforeLoad` is emitted while the status is still `"idle"` and `onLoad` only after the loaders settle. Bridge from the state store instead, which publishes every write:

```ts
import { toState } from "@domphy/core"
import { subscribeToRouterState } from "@domphy/router"

const state = toState(router.state)
const unsubscribe = subscribeToRouterState(router, (next) => state.set(next))

const Spinner: DomphyElement<"div"> = {
    div: (l) => (state.get(l).isLoading ? [{ p: "Loading..." }] : null),
}
```

`state.isLoading` is `status === "pending"`. On the server the stores are non-reactive and cannot change during a render, so `subscribeToRouterState` is a no-op there and returns a no-op unsubscribe.
