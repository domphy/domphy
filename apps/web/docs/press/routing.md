---
title: "Routing"
description: "How @domphy/press maps Markdown files to URL routes, and the routing utilities available."
---

# Routing

## File → Route mapping

Press converts Markdown files under `srcDir` to URL routes automatically:

| File | Route |
|------|-------|
| `docs/index.md` | `/` |
| `docs/guide/index.md` | `/guide/` |
| `docs/guide/intro.md` | `/guide/intro` |
| `docs/api/core.md` | `/api/core` |

Rules:
- A file named `index.md` maps to the directory route (`/guide/` not `/guide/index`)
- Any other `.md` file maps to `/path/slug` (no trailing slash)
- Subdirectories are flattened with `/` separators

## Route → Output file

Each route is written as `<route>/index.html` in `outDir`:

| Route | Output |
|-------|--------|
| `/` | `dist/index.html` |
| `/guide/` | `dist/guide/index.html` |
| `/guide/intro` | `dist/guide/intro/index.html` |

This produces clean URLs without `.html` extensions on all web hosts.

## Sidebar prefix matching

The `sidebar` config is keyed by route prefix. Press picks the **longest** matching prefix for the current route:

```ts
sidebar: {
  "/docs/": [
    { text: "Overview", link: "/docs/" },
  ],
  "/docs/core/": [  // longer prefix → wins for /docs/core/...
    { text: "Core Overview", link: "/docs/core/" },
    { text: "Syntax", link: "/docs/core/syntax" },
  ],
}
```

## Routing utilities

These are exported from `@domphy/press` for use in custom build scripts or server-side rendering:

### `routeForFile(srcRelativePath)`

Converts a file path relative to `srcDir` into a URL route:

```ts
import { routeForFile } from "@domphy/press"

routeForFile("guide/index.md")   // → "/guide/"
routeForFile("guide/intro.md")   // → "/guide/intro"
routeForFile("index.md")         // → "/"
```

### `outFileForRoute(route)`

Returns the output HTML filename for a given route:

```ts
import { outFileForRoute } from "@domphy/press"

outFileForRoute("/")             // → "index.html"
outFileForRoute("/guide/")       // → "guide/index.html"
outFileForRoute("/guide/intro")  // → "guide/intro/index.html"
```

### `discoverPages(srcDir)`

Scans `srcDir` for all `.md` files and returns a sorted list of `PageEntry` objects:

```ts
import { discoverPages } from "@domphy/press"

const pages = discoverPages("/path/to/docs")
// [
//   { route: "/", outFile: "index.html", filePath: "/path/to/docs/index.md" },
//   { route: "/guide/", outFile: "guide/index.html", filePath: "..." },
//   ...
// ]
```

### `flattenSidebar(items)`

Flattens a nested `SidebarItem[]` tree to an ordered flat list of `{ text, link }` entries. Useful for generating prev/next links or a flat sitemap:

```ts
import { flattenSidebar } from "@domphy/press"

const flat = flattenSidebar([
  { text: "Intro", link: "/guide/intro" },
  { text: "Advanced", items: [
    { text: "Config", link: "/guide/config" },
  ]},
])
// [
//   { text: "Intro", link: "/guide/intro" },
//   { text: "Config", link: "/guide/config" },
// ]
```

### `sidebarForRoute(route, config)`

Returns the `SidebarItem[]` for the current route using longest-prefix matching:

```ts
import { sidebarForRoute } from "@domphy/press"

const items = sidebarForRoute("/guide/intro", config)
```

### `prevNextForRoute(route, config)`

Returns the previous and next pages for the current route based on the flattened sidebar order:

```ts
import { prevNextForRoute } from "@domphy/press"

const { prev, next } = prevNextForRoute("/guide/intro", config)
// prev: undefined (first page)
// next: { text: "Config", link: "/guide/config" }
```

## `PageEntry` type

```ts
interface PageEntry {
  route: string     // URL route, e.g. "/guide/intro"
  outFile: string   // relative output path, e.g. "guide/intro/index.html"
  filePath: string  // absolute path to the .md source file
}
```
