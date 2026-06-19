---
layout: home

hero:
  name: Domphy
  text: UI as plain objects. No JSX, no compiler.
  tagline: "{ button: 'Save', $: [button()] } — that's your component. Paste it in a script tag and it runs. No build step, no framework overhead, no wrappers."
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
    details: Elements are plain JS objects. No JSX transform, no build step required. Works in a script tag, a Vite project, a browser extension — anywhere JS runs.
  - title: Add behavior, not abstraction
    details: "Want a tooltip on a button? $: [button(), tooltip()]. One DOM node. No wrapper component, no mystery div > div > button > span."
  - title: Right size for tool apps
    details: Building a SketchUp plugin, Figma panel, or browser extension? You need reactivity and a design system — not a 40 kB runtime and a JSX compiler.
  - title: AI generates it correctly
    details: Plain objects are what LLMs produce naturally. @domphy/doctor catches mistakes and tells the model exactly what to fix — self-corrects without you debugging.
  - title: 74 patches, zero wrappers
    details: button, card, dialog, tooltip, motion, table, form — all patches on native elements. 74 ready-made. Compose any combination. No component hierarchy to fight.
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
