# @domphy/press

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/press/) · [npm](https://www.npmjs.com/package/@domphy/press)

A VitePress-baseline static documentation site framework built on `@domphy/app` and `@domphy/markdown`. Write docs in Markdown, get a fast static site with Domphy-native CSS-in-JS theming — no separate stylesheet to maintain.

## Features

- **VitePress-compatible Markdown** — containers (tip/warning/danger/info), code-group tabs, `<<<` file imports, `!!!include(path)!!!` file includes, GFM task lists, mark/sub/sup
- **Shiki syntax highlighting** — line highlighting, diff annotations, focus groups, copy button
- **Automatic dark mode** — via `themeCSS()` + `pressCSS()` CSS vars; no flash of unstyled content
- **Built-in local search** — client-side JSON index, no server required
- **Full navigation** — top nav, sidebar with collapsible groups and badges, TOC aside, prev/next links
- **Extras** — announcement bar, social links, edit link, last-updated (from git), reading time, heading anchors, mermaid diagrams, i18n locale routing

## Install

```bash
npm install @domphy/press
```

Peer dependencies: `@domphy/app`, `@domphy/core`, `@domphy/markdown`, `@domphy/theme`, `@domphy/ui`.

## Quickstart

Create `press.config.ts`:

```ts
import { defineConfig } from "@domphy/press"

export default defineConfig({
  title: "My Docs",
  description: "Documentation for my project.",
  base: "/",
  hostname: "https://example.com",
  srcDir: "docs",
  outDir: "dist",
  themeConfig: {
    nav: [{ text: "Guide", link: "/guide/" }],
    sidebar: {
      "/guide/": [{ text: "Getting Started", link: "/guide/" }],
    },
  },
})
```

Build and preview:

```bash
npx domphy-press build
npx domphy-press preview
```

## CLI

| Command | Description |
|---|---|
| `domphy-press build` | Build static site to `outDir` |
| `domphy-press dev` | Dev server with live rebuild on Markdown changes |
| `domphy-press preview` | Preview the pre-built output |

## Programmatic API

```ts
import { buildSite, renderDoc, defineConfig, createHighlighter, pressCSS } from "@domphy/press"

// Build full site
await buildSite({ config, srcDir, outDir })

// Render a single Markdown file → DomphyElement[]
const highlight = await createHighlighter()
const result = await renderDoc("# Hello\n\nContent.", { filePath, docsDir, repoRoot, highlight })
// result.body / result.toc / result.frontmatter / result.title

// Get global CSS to inject in <head>
const css = pressCSS()

// Start a dev server
import { startDevServer } from "@domphy/press"
const { server, notify } = startDevServer(outDir, 3000)
```

The `./browser` subpath exports the client-side island runtime (search widget, layout shells) for Vite/browser bundles — no Node.js built-ins.

See the [full docs](https://domphy.com/docs/press/) for configuration reference, Markdown features, routing, search, i18n, and deployment guides.
