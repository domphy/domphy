
<script setup lang="ts">
import DomphyPreview from "./preview/index.vue"
import Counting from "./demos/core/counting.js"
</script>

# Domphy

**A Patch-based UI. Native elements, no components.**

Master 5 functions and you can build anything — `toState`, `merge`, `themeColor`, `themeSize`, `themeSpacing`.

Domphy removes component boundaries, unifies SSR and CSR under one model, automates context-aware styling, and works with any JavaScript library — no adapters or plugins.

## Why Domphy

From the author:

> I published Domphy in February 2026, at 41 years old. I spent 10 years as a structural architect and 6 years teaching myself to code (2 years with js/ts). Every time I tried to learn React or Vue, something felt wrong — logic scattered between data and UI, too many abstractions, too many plugins just to ship a feature. So I built what I wished existed.

> I introduce Patch-based UI Architecture, a paradigm for composing web interfaces distinct from component-based, directive-based, and mixin-based approaches. A Patch is formally defined as a function returning a PartialElement — a composable, stateless descriptor that augments a host element's behavior without wrapping, replacing, or owning it. Unlike existing composition models, a Patch carries no rendering lifecycle, holds no state, and creates no DOM boundary.

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

## Docs

| | |
| --- | --- |
| [Core](/docs/core/) | Rendering, reactivity, SSR, patches, lifecycle hooks |
| [Theme](/docs/theme/) | Context-aware color, size, and spacing |
| [UI](/docs/ui/) | ~60 ready-to-use patches |
| [Integrations](/docs/integrations/) | i18next, TanStack Query, SortableJS, and more |

