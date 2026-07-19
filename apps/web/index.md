---
layout: home
title: Domphy
fullBleed: true
---

<script setup lang="ts">
import HomeHero from "./docs/demos/home/hero.js"
import HomeFeatures from "./docs/demos/home/features.js"
</script>

<DomphyPreview :element="HomeHero" bare />

<DomphyPreview :element="HomeFeatures" bare />

## Packages

| Package | Description |
|---|---|
| [`@domphy/core`](/docs/core/) | Runtime — elements, reactivity, lifecycle, SSR |
| [`@domphy/theme`](/docs/theme/) | Design tokens — color, spacing, size, dark mode |
| [`@domphy/ui`](/docs/ui/) | 95 UI patches — button, dialog, table, form controls… |
| [`@domphy/app`](/docs/app/) | App layer — file-based routing, layouts, SSR, lazy routes |
| [`@domphy/query`](/docs/query/) | Async data fetching, caching, mutations, infinite queries |
| [`@domphy/router`](/docs/router/) | Type-safe client-side router with search params and loaders |
| [`@domphy/table`](/docs/table/) | Headless table — sorting, filtering, pagination, grouping |
| [`@domphy/virtual`](/docs/virtual/) | Virtualization — lists, grids, masonry, infinite scroll |
| [`@domphy/form`](/docs/form/) | Form state, validation, field arrays, async submission |
| [`@domphy/dnd`](/docs/dnd/) | Drag and drop — sortable lists, multi-container, multi-drag |
| [`@domphy/chart`](/docs/chart/) | SVG + WebGL charts — line, bar, pie, scatter, gauge… |
| [`@domphy/press`](/docs/press/) | SSG docs engine — markdown, search, islands, routing |
| [`@domphy/markdown`](/docs/markdown/) | Markdown → Domphy elements (SSR/SSG pipelines) |
| [`@domphy/mermaid`](/docs/mermaid/) | Mermaid diagrams — build-time SVG + client render |
| [`@domphy/palette`](/docs/palette/) | Color science — CIELAB metrics, contrast, palette quality |
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
