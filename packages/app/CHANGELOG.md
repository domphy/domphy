# Changelog

## 0.19.0

- **Scroll restoration on back/forward actually restores.** The outgoing offset was filed under the entry being *restored* (popstate moves the index before the router hears about it), and the offset was applied before the new tree was laid out, so the browser clamped it. The history adapter now records the outgoing entry itself and the router flushes the pending render first.
- **Route announcement + focus reset**, the behaviour Next.js and SvelteKit ship: a client navigation writes the new `document.title` into a visually hidden `aria-live` region and moves focus to the `#hash` target or `<body>`, so screen readers are told and <kbd>Tab</kbd> restarts at the top. Not on the initial render, never for `scroll: false` (SWR re-render, `refresh()`), and not when only the query string changed — a search box syncing into `?q=` navigates per keystroke, and taking focus there is a change of context on input (WCAG 3.2.2).
- **A malformed percent-escape no longer throws out of the matcher.** `renderToStream("/%E0%A4%A")` rejected with a `URIError` (an unhandled rejection in the host server) and `renderToString` answered 500; such a path now matches no route and answers 404. API routes answer 400 (RFC 9110 §15.5.1).
- **`renderToStream` answers an unexpected pre-shell failure with a 500 shell** instead of rejecting, matching `renderToString`.
- **The streamed document declares its own encoding and language**: `<meta charset="utf-8">` is always emitted first (the stream is UTF-8; a plain `text/html` response was being decoded as windows-1252) and `<html lang>` comes from the new `lang` option, default `"en"`.
- **Security**: `RedirectSignal` makes the redirect target an ASCII URI-reference (RFC 9110 §10.2.2) — CR/LF/NUL stripped, everything above U+007F percent-encoded — so no consumer (`Location` on an API route, `SSRResult.redirect`, `StreamResult.redirect`) can be made to emit a second header field, and `redirect("/日本語")` no longer throws a `TypeError` out of the API handler's catch block (undici rejects a header value above U+00FF). The CSP nonce is filtered to the base64 alphabet before it is stamped into SSR markup, and the default error block withholds `error.message` from production visitors.
- `createI18nMiddleware({ prefixDefault: true })` keeps the query string and fragment on its locale redirect.
- `cookies()` unwraps a DQUOTE-wrapped cookie-value (RFC 6265 §4.1.1).
- `DataCache` releases entries it can no longer serve: an entry prefetched for a route without `revalidate` and never consumed within the 30 s prefetch window used to be retained, loader payload included, for the life of the session (one per link on a page using `prefetch: "visible"`). `revalidate` and SSR-seeded entries are untouched — the first are served by stale-while-revalidate at any age, the second for the whole of their route's `revalidate` window.

## 0.18.5

- Streaming/TTFB docs + tests: held-promise stream; i18n prefetch uses locale-prefixed hrefs.
- Middleware JSDoc: runs before navigation, prefetch, and server render.

## 0.18.4

- `DataCache` invalidate; `navLink` / router / tree / image audit-fix pass; extra SSR and parallel-route tests.

## 0.1.0

Initial release — a port of the Next.js App Router feature set for Domphy:

- Route tree with Next.js segment syntax: static, `[slug]`, `[...parts]`, `[[...parts]]`, `(group)`, multi-part static segments, route-level redirects
- Nested layouts with per-segment `loading`, `error` and `notFound` boundaries
- `AppRouter`: push/replace/back/forward/refresh/prefetch, navigation events, scroll restoration, reactive `state` (`pathname`, `search`, `hash`, `params`, `status`, `error`)
- `navLink()` patch: client navigation, hover/visible prefetch, `aria-current` + `data-active`
- Per-segment `loader` with `revalidate` caching and a 30s prefetch window; `redirect()`, `permanentRedirect()`, `notFound()` callable from loaders, metadata and middleware
- Metadata API: title templates, description, openGraph, twitter, icons, robots, alternates, `metadataBase`, dynamic metadata functions
- Global and per-route middleware with `rewrite()`
- SSR: `renderToString()` (html, css, head, status, redirect, loader data + bootstrap script) and `hydrate()` without re-running loaders
- API routes: `createApiHandler()` + `json()` on web-standard Request/Response
- `optimizedImage()` patch and `script()` block
- Browser and memory history adapters
