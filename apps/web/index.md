---
layout: home

hero:
  name: Domphy
  text: UI as plain objects.
  tagline: "{ button: 'Save', $: [button()] } — that's your component. Works in a script tag, Vite, or a browser extension."
  actions:
    - theme: brand
      text: Get Started
      link: /docs/quickstart
    - theme: alt
      text: Why Domphy
      link: /docs/guide/why-domphy
    - theme: alt
      text: Building with AI
      link: /docs/ai

features:
  - title: No compiler, no syntax tax
    details: Elements are plain JS objects. Works in a script tag, a Vite project, a browser extension — anywhere JS runs. ~9 kB core.
  - title: Add behavior, not abstraction
    details: "Want a tooltip on a button? $: [button(), tooltip()]. One DOM node. Patches apply to the native element you wrote — no wrapper components."
  - title: Built-in design system
    details: themeColor, themeSpacing, themeSize — dark mode, density, size scales are native. No Tailwind configuration, no CSS-in-CSS variable plumbing. Write once, adapts everywhere.
  - title: AI generates it correctly
    details: Plain objects are what LLMs produce naturally. @domphy/doctor catches mistakes and tells the model exactly what to fix — self-corrects without you debugging. No other framework ships this loop.
  - title: Full TanStack-compatible stack
    details: "1-1 ports of TanStack Query, Table, Router, Virtual, Form — identical APIs. The Domphy adapter is the only difference."
  - title: Right size for tool apps
    details: "Building a SketchUp plugin, Figma panel, or VS Code extension? Domphy brings reactivity and a design system — the right fit for plugin ecosystems."
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

- [Why Domphy](/docs/guide/why-domphy) — how it compares to React, Svelte, Solid
- [Coming from React](/docs/guide/from-react) — your React concepts translated
- [Documentation](/docs/)
- [Core Guide](/docs/core/)
- [UI Patches](/docs/ui/)
- [Building with AI](/docs/ai)
