---
layout: home

hero:
  name: Domphy
  text: Reactive UI without React.
  tagline: "{ button: 'Save', $: [button()] } — that's your component. No JSX, no compiler, no React peer dep. Full TanStack suite included."
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
  - title: No compiler, no syntax tax
    details: "{ button: 'Save' } is a valid element. Drop it in a script tag and it runs. Add a JSX compiler later if you want — you don't have to."
  - title: Add behavior, not abstraction
    details: "Want a tooltip on a button? $: [button(), tooltip()]. One DOM node. No wrapper component, no mystery div > div > button > span."
  - title: TanStack, minus the React dep
    details: createQuery, createTable, createRouter, createForm, createVirtualizer — byte-identical TanStack cores, thin Domphy adapter. Same API you know. No React peer dep.
  - title: Right size for tool apps
    details: Building a plugin, extension, or dashboard? You need reactivity and a design system — not a 40 kB runtime. Domphy fits in a script tag.
  - title: AI generates it correctly
    details: Plain objects are what LLMs produce. @domphy/doctor catches what they get wrong and tells the model exactly what to fix — no manual debugging.
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
