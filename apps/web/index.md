---
layout: home

hero:
  name: Domphy
  text: Plain objects. Patches, not wrappers.
  tagline: Write UI as plain JS objects. Compose behavior with patches. Use TanStack query/table/router/form — without React.
  actions:
    - theme: brand
      text: Get Started
      link: /docs/quickstart
    - theme: alt
      text: Building with AI
      link: /docs/ai
    - theme: alt
      text: GitHub
      link: https://github.com/domphy/domphy

features:
  - title: Plain objects, no JSX
    details: Elements are "{ button: 'Save', $: [patch()] }". No build step, no compiler, no syntax to learn. Reads like data, runs anywhere.
  - title: Patches, not wrapper components
    details: Compose behavior directly on native elements — $:[button(), tooltip()]. Your DOM stays clean. No mystery div > div > button > span.
  - title: TanStack suite, no React
    details: query, table, router, virtual, form — byte-identical TanStack cores + thin adapters. Same API you already know, no React peer dep.
  - title: AI code that actually works
    details: Plain objects are what LLMs naturally generate. @domphy/doctor validates generated trees and reports exactly what's wrong — models self-correct without you debugging JSX.
---

## Installation

::: code-group
```bash [NPM]
npm install @domphy/ui
```
```html [CDN]
<script src="https://unpkg.com/@domphy/ui/dist/core-theme-ui.global.js"></script>
```
:::

## Start Here

- [Documentation](/docs/)
- [Core Guide](/docs/core/)
- [UI Patches](/docs/ui/)
- [Integrations](/docs/integrations/)
