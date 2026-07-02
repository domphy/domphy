# Navigation

## navLink

`navLink()` is the `next/link` equivalent — a patch for native `a` elements:

```ts
import { navLink } from "@domphy/app"
import { link } from "@domphy/ui"

{
  a: "Blog",
  $: [link(), navLink({ href: "/blog" })],
}
```

It intercepts plain left-clicks for client navigation (modified clicks, `target="_blank"`, downloads and external origins fall through to the browser), prefetches, and exposes active state:

- `aria-current="page"` and `data-active` are set reactively while the link matches the current pathname (descendant paths count unless `exact: true`)
- style the active state with a selector: `style: { "&[data-active]": { ... } }`

Props:

| Prop | Default | Meaning |
| --- | --- | --- |
| `href` | required | target path |
| `prefetch` | `"hover"` | `"hover"`, `"visible"` (IntersectionObserver) or `false` |
| `replace` | `false` | replace the history entry |
| `scroll` | `true` | scroll to top (or `#hash`) after navigating |
| `exact` | `false` | active only on exact pathname match |
| `router` | app router | explicit router instance |

::: warning Pass `router` explicitly during concurrent SSR
When no `router` prop is given, `navLink` resolves the app router lazily from a single module-level "default router" set by the most recently constructed `AppRouter`. A Node server that serves multiple requests concurrently (each calling `createApp(routes)` + `renderToString`/`renderToStream` per request, as in [Server Rendering](/docs/app/ssr)) can have that default router reassigned mid-render by another in-flight request, causing `navLink`'s active-state resolution to throw or read the wrong request's state. Always pass `router: app.router` explicitly to `navLink` on the server (or anywhere `renderToString`/`renderToStream` may run concurrently) to avoid this race; on the client there is only ever one app instance, so the default lookup is safe.
:::

## The Router

`app.router` is the `useRouter()` equivalent:

```ts
const router = app.router

router.push("/blog/hello")        // navigate, push history
router.replace("/login")          // navigate, replace history
router.back()                     // history back
router.forward()                  // history forward
router.refresh()                  // clear loader cache, re-render current URL
router.prefetch("/blog/hello")    // run loaders ahead of navigation
```

`push`/`replace` resolve relative hrefs against the current URL and hand off external origins to the browser.

## Navigation Events

The `next/router` events equivalent:

```ts
const release = router.addEventListener("routeChangeStart", (href) => {
  console.log("navigating to", href)
})

router.addEventListener("routeChangeComplete", (href) => { ... })
router.addEventListener("routeChangeError", (error, href) => { ... })

release() // unsubscribe
```

## Scroll Behavior

The router manages scrolling like Next.js: scroll to top after navigation, scroll to the `#hash` element when present, and restore the saved position on back/forward. Pass `scroll: false` to `navigate`/`push`/`navLink` to opt out.

## History Modes

By default the router binds to the browser history. For tests, embedded demos or custom hosts, pass a memory history:

```ts
import { createApp, createMemoryHistory } from "@domphy/app"

const app = createApp(routes, { history: createMemoryHistory("/start") })
```

`history: null` disables history entirely (used internally for SSR).
