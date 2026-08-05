---
layout: home
title: Domphy
description: The AI-friendly UI framework — patch-based, framework-agnostic, no virtual DOM. UIs as plain objects, reactivity without a compiler.
fullBleed: true
---

<script setup lang="ts">
import HomeHero from "./docs/demos/home/hero.js"
import HomeFeatures from "./docs/demos/home/features.js"
import StateDemo from "./docs/demos/quickstart/03-state.js"
</script>

<DomphyPreview :element="HomeHero" bare />

<DomphyPreview :element="HomeFeatures" bare />

## This is a component

No JSX, no compiler — a plain object plus patches, reactive out of the box:

```ts
import { toState } from "@domphy/core"
import { button, heading } from "@domphy/ui"

const count = toState(0)

const App = {
  div: [
    { h3: (l) => `Count: ${count.get(l)}`, $: [heading()] },
    { button: "Increment", onClick: () => count.set(count.get() + 1), $: [button({ color: "primary" })] },
    { button: "Reset", onClick: () => count.set(0), $: [button()] },
  ],
}
```

Live, right here on the page:

<DomphyPreview :element="StateDemo" bare />

## Packages

| Package | Description |
|---|---|
| [`@domphy/core`](/docs/core/) | Runtime — elements, reactivity, lifecycle, SSR |
| [`@domphy/theme`](/docs/theme/) | Design tokens — color, spacing, size, dark mode |
| [`@domphy/ui`](/docs/ui/) | 98 UI patches — button, dialog, table, form controls… |
| [`@domphy/app`](/docs/app/) | App layer — file-based routing, layouts, SSR, lazy routes |
| [`@domphy/query`](/docs/query/) | Async data fetching, caching, mutations, infinite queries |
| [`@domphy/router`](/docs/router/) | Type-safe client-side router with search params and loaders |
| [`@domphy/table`](/docs/table/) | Headless table — sorting, filtering, pagination, grouping |
| [`@domphy/virtual`](/docs/virtual/) | Virtualization — lists, grids, masonry, infinite scroll |
| [`@domphy/form`](/docs/form/) | Form state, validation, field arrays, async submission |
| [`@domphy/dnd`](/docs/dnd/) | Drag and drop — sortable lists, multi-container, multi-drag |
| [`@domphy/blocks`](/docs/blocks/) | 173 composed blocks — sidebars, auth pages, dashboards, effects |
| [`@domphy/chart`](/docs/chart/) | SVG + WebGL charts — line, bar, pie, scatter, gauge… |
| [`@domphy/three`](/docs/three/) | Declarative three.js scene graph on Domphy reactivity |
| [`@domphy/editor`](/docs/editor/) | Rich-text editor — Tiptap-compatible API, self-contained engine |
| [`@domphy/floating`](/docs/floating/) | Anchor positioning — floating-ui core, zero-dep, powers overlays |
| [`@domphy/press`](/docs/press/) | SSG docs engine — markdown, search, islands, routing |
| [`@domphy/markdown`](/docs/markdown/) | Markdown → Domphy elements (SSR/SSG pipelines) |
| [`@domphy/mermaid`](/docs/mermaid/) | Mermaid diagrams — build-time SVG + client render |
| [`@domphy/i18n`](/docs/i18n/) | i18next wrapper with reactive `t(listener, key)` |
| [`@domphy/doctor`](/docs/doctor/) | Static analyzer — flags non-idiomatic code, auto-fixes |
| [`@domphy/mcp`](/docs/mcp/) | MCP server — 10 tools for AI agents to explore the framework |
| [`create-domphy`](https://www.npmjs.com/package/create-domphy) | Scaffolder — `npm create domphy@latest` Vite + TS starter |

## Installation

::: code-group
```bash [NPM]
npm install @domphy/ui @domphy/core @domphy/theme
```
```html [CDN]
<script src="https://unpkg.com/@domphy/ui/dist/core-theme-ui.global.js"></script>
```
:::
