---
title: "Programmatic API"
description: "Full programmatic API reference for @domphy/press — build pipeline, rendering, and server."
---

# Programmatic API

All functions are exported from `@domphy/press`.

## Build

### `buildSite(options)`

Builds the full static site: discovers pages, renders each Markdown file, generates search index, builds the islands bundle, and writes all output files.

```ts
import { buildSite } from "@domphy/press"
import type { BuildOptions, FeatureConfig, HeroConfig } from "@domphy/press"
import { config } from "./press.config.js"

await buildSite({
  config,
  srcDir: config.srcDir,
  outDir: config.outDir,
  publicDir: "public",   // optional, copied to outDir as-is
})
```

`BuildOptions`:

```ts
interface BuildOptions {
  config: SiteConfig
  srcDir: string         // absolute path to Markdown source directory
  outDir: string         // absolute path to output directory
  publicDir?: string     // optional: absolute path to static assets folder
  incremental?: boolean  // skip unchanged pages (used by dev mode for fast rebuilds)
}
```

### `defineConfig(config)`

Builds a new `SiteConfig` with defaults — not a passthrough. Contract: [Configuration](/docs/press/config).

```ts
import { defineConfig } from "@domphy/press"
export default defineConfig({ /* UserConfig → SiteConfig */ })
```

## Rendering

### `renderDoc(source, options)`

Renders a Markdown string to a `RenderedDoc`. The primary transform in the build pipeline — also usable standalone for custom pipelines or SSR:

```ts
import { renderDoc, createHighlighter } from "@domphy/press"

const highlight = await createHighlighter()

const result = await renderDoc("# Hello\n\nContent.", {
  filePath: "/docs/guide/index.md",
  docsDir: "/docs",
  repoRoot: "/",
  highlight,
  base: "/",           // optional: prefixes root-relative links/images
})
// result.body: DomphyElement[]
// result.toc: TocEntry[]
// result.title: string
// result.frontmatter: Record<string, unknown>
// result.islands: IslandRef[]
```

`RenderDocOptions`:

```ts
interface RenderDocOptions {
  filePath: string                             // absolute path to the .md file
  docsDir: string                              // absolute path to srcDir
  repoRoot: string                             // repo root (for git last-updated)
  highlight: (code: string, lang: string) => string
  base?: string                                // site base, default "/"
}
```

`base` prefixes root-relative link and image destinations written in the
Markdown (`[x](/guide/)` → `/docs/guide/` when `base` is `"/docs/"`), the same
way the layout prefixes nav and sidebar hrefs. External URLs, anchors and
relative paths pass through. `buildSite()` passes `config.base` for you.

`RenderedDoc`:

```ts
interface RenderedDoc {
  frontmatter: Record<string, unknown>
  body: DomphyElement[]
  toc: TocEntry[]
  islands: IslandRef[]
  title: string
}
```

### `createHighlighter()`

Creates a Shiki-based syntax highlighter. Returns `(code, lang) => string`. The highlighter is shared/cached per process:

```ts
import { createHighlighter } from "@domphy/press"

const highlight = await createHighlighter()
const html = highlight("const x = 1", "typescript")
```

### `homeShell(ctx)` / `pageShell(ctx)`

Layout shells used internally by `buildSite()`. Pass a `LayoutContext` to get the full page element tree (header + sidebar + content + TOC + footer). Useful for custom SSR pipelines:

```ts
import { homeShell, pageShell } from "@domphy/press"
import type { LayoutContext } from "@domphy/press"

const ctx: LayoutContext = { route: "/", title: "...", body: [...], /* ... */ }
const element = pageShell(ctx)  // DomphyElement
```

### `pressCSS()`

Returns a CSS string containing the global press reset and markdown content styles (code blocks, custom containers, tables, etc.). Inject into `<head>` of every page:

```ts
import { pressCSS } from "@domphy/press"

const css = pressCSS()  // string
```

### `RUNTIME_SCRIPT`

A string constant containing the client-side runtime `buildSite()` inlines into every page. Before first paint it applies the stored `dp-theme` choice, or the visitor's `prefers-color-scheme` when none is stored. It then wires up the dark-mode toggle (`[data-theme-toggle]`, kept in sync with `aria-pressed`), the mobile nav drawer (`[data-menu-toggle]` with `aria-expanded`, `.dp-sidebar-backdrop`, <kbd>Escape</kbd> to close — which returns focus to the toggle), the nav flyouts' `aria-expanded` (`[data-nav-dropdown]`), copy-code buttons (`[data-copy]`), collapsible sidebar groups (`[data-sidebar-toggle]`), and dismissible announcement bars (`[data-dismiss-announcement]`). If you write a custom `htmlDocument()` (as `apps/web` does for its production build), import this instead of hand-rolling your own — a hand-rolled copy will drift out of sync as these handlers evolve:

```ts
import { RUNTIME_SCRIPT } from "@domphy/press"

const html = `<script>${RUNTIME_SCRIPT}</script>`
```

## Server

### `startServer(root, port, base?)`

Starts a static file server to preview the built output:

```ts
import { startServer } from "@domphy/press"

const server = startServer("/path/to/dist", 4173, "/docs/")
// server is a Node.js http.Server
```

`base` defaults to `"/"`. Pass the site's `config.base` for a sub-path
deployment: the build emits every asset URL and internal href under that
prefix, so the server has to answer there (`http://localhost:4173/docs/`).
Requests outside the base return 404 rather than resolving as if no base were
configured. The `domphy-press preview` CLI reads it from `press.config.ts`.

### `startDevServer(root, port, base?)`

Starts a development server with live rebuild on Markdown changes. Used by the `domphy-press dev` CLI command:

```ts
import { startDevServer } from "@domphy/press"

const { server, notify } = startDevServer("/path/to/dist", 3000, "/docs/")
// server — Node.js http.Server
// notify() — broadcast a reload event to all connected browser tabs (SSE)
```

`base` behaves as in `startServer`.

## TocEntry

```ts
interface TocEntry {
  level: number   // heading level 1-6
  text: string    // plain-text heading content
  slug: string    // anchor id
}
```

## Markdown pipeline

The Markdown API (formerly the standalone `@domphy/markdown` package) is exported from both the main entry and `@domphy/press/browser`: `parseMarkdown`, `markdownToDomphy`, `createMarkdown`, `walkMdast`, `splitFrontmatter`, `transformOutsideCodeBlocks`, `createUniqueSlugger`, `defaultSlugify`. The pipeline itself is free of Node.js built-ins, so browser bundles import it from `/browser` (the main entry also pulls in `buildSite`/`startServer`, which need Node). The one difference: `createMarkdown({ math: true })` resolves the optional `remark-math` peer through Node module resolution, so it works only on the main entry — in a browser bundle, import `remark-math` yourself and pass it via `plugins`. See [Markdown](/docs/markdown/) for the full reference.

## LayoutContext

```ts
interface LayoutContext {
  route: string
  title: string
  body: DomphyElement[]
  toc: TocEntry[]
  frontmatter: Record<string, unknown>
  config: SiteConfig
  lastUpdated?: string    // ISO 8601 date from git, when lastUpdated: true
  readingTime?: number    // estimated reading minutes
  filePath?: string       // relative path from srcDir
}
```
