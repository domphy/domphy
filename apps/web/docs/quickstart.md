<script setup lang="ts">
import DomphyPreview from "./preview/index.vue"
import HelloWorld from "./demos/quickstart/01-hello.ts"
import WithPatches from "./demos/quickstart/02-patches.ts"
import WithState from "./demos/quickstart/03-state.ts"
import WithForm from "./demos/quickstart/04-form.ts"
</script>

# 5-Minute Quickstart

## Install

::: code-group
```bash [NPM]
npm install @domphy/ui
```
```html [CDN]
<script src="https://unpkg.com/@domphy/ui/dist/core-theme-ui.global.js"></script>
```
:::

`@domphy/ui` includes `@domphy/core` and `@domphy/theme` — one install gives you everything.

## 1. Hello World

A Domphy element is a plain object. The key is the HTML tag, the value is the content.

<DomphyPreview :element="HelloWorld"/>

<<< @/docs/demos/quickstart/01-hello.ts

No classes, no components, no JSX. Just objects.

## 2. Add Patches

A **patch** is a function that adds styling and behavior to an element. Apply it with the `$` property.

<DomphyPreview :element="WithPatches"/>

<<< @/docs/demos/quickstart/02-patches.ts

Every patch handles its own sizing, spacing, colors, and accessibility. You write the structure — patches do the rest.

## 3. Reactive State

Use `toState()` for reactive values. Read with `state.get(listener)` inside a reactive function to auto-subscribe.

<DomphyPreview :element="WithState"/>

<<< @/docs/demos/quickstart/03-state.ts

No virtual DOM, no diffing. Changing state updates only the properties that read it.

## 4. Forms

The `form` and `field` patches handle validation, error display, and two-way binding automatically.

<DomphyPreview :element="WithForm"/>

<<< @/docs/demos/quickstart/04-form.ts

## What's Next

- [Core concepts](/docs/core/) — Syntax, reactivity, lifecycle
- [Theme](/docs/theme/) — Tone, size, density
- [All 69 patches](/docs/ui/) — Buttons, inputs, cards, dialogs, and more
- [Showcase: Chromametry App](https://chromametry.com) — Full production app built entirely with Domphy
- [Research](/docs/research/) — The two papers behind the design system
