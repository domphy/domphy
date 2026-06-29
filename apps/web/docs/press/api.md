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

Type-helper passthrough. Returns its argument typed as `SiteConfig`. Use this in `press.config.ts` for TypeScript inference:

```ts
import { defineConfig } from "@domphy/press"
export default defineConfig({ /* inferred as SiteConfig */ })
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
}
```

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

## Server

### `startServer(root, port)`

Starts a static file server to preview the built output:

```ts
import { startServer } from "@domphy/press"

const server = startServer("/path/to/dist", 4173)
// server is a Node.js http.Server
```

### `startDevServer(root, port)`

Starts a development server with live rebuild on Markdown changes. Used by the `domphy-press dev` CLI command:

```ts
import { startDevServer } from "@domphy/press"

const { server, notify } = startDevServer("/path/to/dist", 3000)
// server — Node.js http.Server
// notify() — broadcast a reload event to all connected browser tabs (SSE)
```

## TocEntry

```ts
interface TocEntry {
  level: number   // heading level 1-6
  text: string    // plain-text heading content
  slug: string    // anchor id
}
```

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
