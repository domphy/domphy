---
title: "@domphy/press"
description: "Static documentation site framework for Domphy — built on @domphy/app + @domphy/markdown, VitePress-compatible."
---

# @domphy/press

A VitePress-baseline static documentation site framework built on `@domphy/app` and `@domphy/markdown`. Features the same Markdown authoring experience as VitePress plus Domphy-native CSS-in-JS theming — no separate stylesheet to maintain.

## Features

- **VitePress-compatible Markdown** — containers (tip/warning/danger/info/note/…), code-group tabs, `<<<` file imports, GFM task lists, mark/sub/sup, emoji
- **Shiki syntax highlighting** — line highlighting, diff annotations, focus groups, copy button
- **Automatic dark mode** — via `themeCSS()` + `pressCSS()` CSS var overrides; no flash of unstyled content
- **Built-in local search** — client-side JSON index, no server required
- **Full VitePress navigation** — top nav, sidebar with collapsible groups and badges, TOC aside, prev/next
- **Extras** — announcement bar, social links, edit link, last-updated (from git), reading time, heading anchors, mermaid diagrams (CDN), i18n locale routing

## Installation

```bash
npm install @domphy/press
```

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
  head: ['<link rel="icon" href="/favicon.svg">'],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/" },
    ],
    sidebar: {
      "/guide/": [
        { text: "Getting Started", link: "/guide/" },
      ],
    },
  },
})
```

Build:

```bash
npx domphy-press build
npx domphy-press preview
```

See the [Configuration](./config.md) and [Markdown Features](./markdown.md) guides for full details.
