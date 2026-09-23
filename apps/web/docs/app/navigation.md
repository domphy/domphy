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
| `router` | app router | explicit router instance — optional for factory-created links |

`navLink` captures the router at patch-creation time. Page/layout factories run inside a per-request `renderStack`, so a link created in a `page` / `layout` factory binds to the router that is rendering it — concurrent `renderToString` / `renderToStream` do **not** require `router:` on every link. Pass `router` when the patch is created **outside** a render (module scope, a helper that runs before `createApp()`, a test harness). The prop is always allowed; it is not required for factory-created links.

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

Scroll positions are stored per history entry. The position of the entry you are *leaving* is recorded before the router hears about the navigation (on `popstate` for back/forward, at transition start otherwise), and the pending render is flushed before the offset is applied — otherwise the browser clamps it to the height of the page still on screen.

## Route Announcement and Focus

A client navigation replaces the page without a document load, so the router does what the load would have done (the Next.js route announcer / SvelteKit equivalent):

- the new `document.title` is written into a visually hidden `aria-live="assertive"` region (`#domphy-route-announcer`, appended to `<body>`), so screen readers announce the page;
- focus moves to the `#hash` target when the URL has one, otherwise to `<body>`, so the next <kbd>Tab</kbd> restarts the tab order at the top of the new page instead of continuing from the link that was clicked.

Neither happens on the initial render (a real document load already did it), nor for `scroll: false` transitions (a background stale-while-revalidate re-render, an explicit `router.refresh()`), nor when only the query string changed. That last one matters for a page that syncs a filter or a search box into `?q=`: it navigates on every keystroke, and moving focus there would pull it out of the field being typed into — a change of context on input, [WCAG 3.2.2](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html). A URL with a `#hash` always focuses its target, as a document load would.

## History Modes

By default the router binds to the browser history. For tests, embedded demos or custom hosts, pass a memory history:

```ts
import { createApp, createMemoryHistory } from "@domphy/app"

const app = createApp(routes, { history: createMemoryHistory("/start") })
```

`history: null` disables history entirely (used internally for SSR).
