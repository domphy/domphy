---
title: "Search"
description: "Built-in client-side search in @domphy/press — no server, no third-party service."
---

# Search

Press ships a built-in client-side full-text search. No server, no Algolia account required — the index is built at compile time and shipped as a JSON file.

## Configuration

Search is **enabled by default**. To disable:

```ts
themeConfig: {
  search: false,
}
```

To customize the UI:

```ts
themeConfig: {
  search: {
    placeholder: "Search documentation…",
    limit: 10,           // max results to show (default: 10)
  },
}
```

## How it works

1. **Build time** — `buildSite()` calls `buildSearchIndex(docs)` which tokenizes all page titles, body text, and TOC heading text into an inverted index stored in `/assets/search-index.json`.
2. **Runtime** — The search widget lazy-loads the index on first focus, runs tokenized prefix queries client-side, and displays results with section links.
3. **Highlighting** — Results show the matched page title, section heading, and route. The current query terms are highlighted in the result list.

## Programmatic API

### `buildSearchIndex(docs)`

Builds a serialized JSON index string from an array of `SearchDocument` objects. Used internally by `buildSite()` but also callable for custom pipelines:

```ts
import { buildSearchIndex } from "@domphy/press"
import type { SearchDocument } from "@domphy/press"

const docs: SearchDocument[] = [
  { route: "/guide/", title: "Getting Started", text: "...", toc: [...] },
]

const indexJson = buildSearchIndex(docs)  // compact JSON string
```

### `queryIndex(serializedIndex, query, limit?)`

Queries a serialized index string (from `buildSearchIndex`) for a given search term. Returns scored, ranked `SearchResult[]`:

```ts
import { queryIndex } from "@domphy/press"

const results = queryIndex(indexJson, "reactivity", 5)
// [
//   { route: "/core/", pageTitle: "Core", heading: "Reactivity", slug: "reactivity", score: ... },
//   ...
// ]
```

`SearchResult`:

```ts
interface SearchResult {
  route: string      // page route
  pageTitle: string  // title of the page
  heading: string    // matched heading (page title for page-level hits, section heading for section hits)
  slug: string       // heading slug (empty string for page-level hits)
  isPage: boolean    // true for page-level hits, false for section-level hits
  score: number      // relevance score — higher is better
  href: string       // full navigation target: route + "#" + slug (or just route for page hits)
}
```

### `searchWidget(options?)`

Returns a Domphy element containing the full search UI — input field + dropdown results. Suitable for embedding in a custom header slot:

```ts
import { searchWidget } from "@domphy/press"

const widget = searchWidget({
  placeholder: "Search…",
  limit: 8,
})
```

`SearchWidgetOptions`:

```ts
interface SearchWidgetOptions {
  indexUrl?: string       // URL to the search index JSON (default: "/search-index.json")
  placeholder?: string    // input placeholder text
  limit?: number          // max results (default: 10)
}
```

### `mountSearch(container, options?)`

Mounts the search widget into a DOM element. Call this in a browser island or after DOM ready:

```ts
import { mountSearch } from "@domphy/press/browser"

const el = document.getElementById("search-container")!
mountSearch(el, { placeholder: "Search…", limit: 8 })
```

Import from `@domphy/press/browser` (not the main entry) to avoid pulling Node.js built-ins into browser bundles.

## Custom search placement

Replace the default search input in the header by overriding the `header` slot and embedding `searchWidget()`:

```ts
import { defineConfig, type LayoutContext, searchWidget } from "@domphy/press"
import { themeColor, themeSpacing } from "@domphy/theme"

export default defineConfig({
  themeConfig: {
    slots: {
      header: (ctx: LayoutContext) => ({
        header: [
          { a: ctx.config.title, href: "/" },
          searchWidget({ placeholder: "Search…" }),
        ],
        style: {
          display: "flex",
          gap: themeSpacing(4),
          padding: `0 ${themeSpacing(6)}`,
          background: themeColor(null, "shift-1"),
        },
      }),
    },
  },
})
```
