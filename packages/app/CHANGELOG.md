# Changelog

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
