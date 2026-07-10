---
layout: home
title: Domphy

hero:
  name: Domphy
  text: UI as plain objects.
  tagline: No JSX. No virtual DOM. No compiler. Just JS objects that become real DOM.
  actions:
    - theme: brand
      text: Get Started
      link: /docs/quickstart
    - theme: alt
      text: Building with AI
      link: /docs/ai

features:
  - title: No compiler, no syntax tax
    details: Elements are plain JS objects. Works in a script tag, Vite, browser extension — anywhere JS runs. ~15 kB core + theme gzip.
  - title: AI generates it correctly
    details: Plain objects are what LLMs produce naturally. @domphy/doctor catches mistakes and tells the model exactly what to fix — self-corrects without you debugging.
  - title: Complete stack included
    details: Query, Router, Table, Virtual, Form, DnD, i18n, Charts — all built in. No stitching third-party libraries together.
---

<script setup lang="ts">
import HomeHero from "./docs/demos/home/hero.js"
</script>

<DomphyPreview :element="HomeHero" bare />

## Packages

| Package | Description |
|---|---|
| [`@domphy/core`](/docs/core/) | Runtime — elements, reactivity, lifecycle, SSR |
| [`@domphy/theme`](/docs/theme/) | Design tokens — color, spacing, size, dark mode |
| [`@domphy/ui`](/docs/ui/) | 87 UI patches — button, dialog, table, form controls… |
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
| [`@domphy/audit`](/docs/audit/) | Layout verification via Playwright — overlap, contrast, geometry |
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
