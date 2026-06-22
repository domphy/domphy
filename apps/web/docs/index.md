<script setup lang="ts">
import Counting from "./demos/core/counting.js"
</script>

# Domphy

**The AI-friendly UI framework. Patch-based, native elements, no components.**

Framework-agnostic, no JSX, no virtual DOM, no build step required — and the most **AI-friendly** UI framework (learnable from one spec file, self-correcting via [`@domphy/doctor`](/docs/doctor/)).

**Runtime + design system** — tiny, tree-shakeable:

- `@domphy/core` — runtime: rendering, reactivity, lifecycle, SSR, CSS-in-JS (≈ `react-dom` + SSR + CSS-in-JS in one)
- `@domphy/theme` — context-aware color/size/spacing tokens
- `@domphy/ui` — 86 patches for native HTML (≈ MUI)

**Data & logic** — 1-1 ports of the TanStack cores (identical API) + a Domphy adapter at the `/domphy` subpath:

- `@domphy/query` — async state (TanStack Query core)
- `@domphy/table` — headless tables (TanStack Table core)
- `@domphy/router` — type-safe routing (TanStack Router core)
- `@domphy/virtual` — virtualization (TanStack Virtual core)
- `@domphy/form` — forms (TanStack Form core)

**App layer & tools:**

- `@domphy/dnd` — drag & drop / sortable lists
- `@domphy/palette` — color-palette engine (generate accessible ramps + measure quality); design-time companion to theme
- `@domphy/app` — Next.js App Router-style framework (routes, layouts, loaders+SWR, metadata, middleware, parallel/intercepting routes, lazy code-split routes, SSR + streaming, API routes)
- `@domphy/markdown` — Markdown → Domphy element trees for SSR/SSG (this docs site runs on it)
- `@domphy/mermaid` — render Mermaid diagrams (build-time SVG + client patch)
- `@domphy/doctor` — static analyzer that flags non-idiomatic code (`diagnose`/`validate`; powers AI self-correction)
- `@domphy/mcp` — MCP server exposing patches/packages/rules + doctor + app-block registry to agents

Domphy removes component boundaries, unifies SSR and CSR under one model, automates context-aware styling, and works with any JavaScript library without adapters or plugins. For anything outside these packages (charts, rich text, i18n…), use the vanilla library directly — see [Integrations](/docs/integrations/).

## Why Domphy

From the author:

> I published Domphy in February 2026, at 41 years old. I spent 10 years as a structural architect and 6 years teaching myself to code (2 years with js/ts). Every time I tried to learn React or Vue, something felt wrong: logic scattered between data and UI, too many abstractions, too many plugins just to ship a feature. So I built what I wished existed.

> I introduce Patch-based UI Architecture, a paradigm for composing web interfaces distinct from component-based, directive-based, and mixin-based approaches. A Patch is formally defined as a function returning a PartialElement: a composable, stateless descriptor that augments a host element's behavior without wrapping, replacing, or owning it. Unlike existing composition models, a Patch carries no rendering lifecycle, holds no state, and creates no DOM boundary.

## Installation

::: code-group
```bash [NPM]
npm install @domphy/ui
```
```html [CDN]
<script src="https://unpkg.com/@domphy/ui/dist/core-theme-ui.global.js"></script>
```
:::

## Quick Start

<DomphyPreview :element="Counting"/>

<<< @/docs/demos/core/counting.ts
