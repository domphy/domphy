<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Overview from "../demos/core/Overview.ts?raw"
</script>

# Core

`@domphy/core` is the runtime of Domphy.

It takes plain JavaScript objects and turns them into:

- DOM on the client
- HTML and CSS for SSR
- reactive updates after state changes
- lifecycle and patch execution

If you only want to understand "how Domphy works", this is the package to learn first.

<CodeEditor :code="Overview" />

## What You Write

In Domphy, an element is just a plain object.

```ts
{
  button: "Count: 0",
  class: "primary",
  onClick: () => console.log("clicked"),
}
```

You do not write templates or JSX here. You describe the UI with objects, and `@domphy/core` handles rendering, updates, and SSR.

## Quick Start

Client rendering starts by wrapping your root element with `ElementNode`, then calling `render()` with a DOM target.

```ts
import { ElementNode } from "@domphy/core"

const App = {
  h1: "Hello Domphy",
}

const root = new ElementNode(App)
root.render(document.getElementById("app")!)
```

That is the core entry point:

- define a plain object tree
- create an `ElementNode`
- render it into the DOM

## What Core Does

When you create an `ElementNode`, core handles the full runtime for that tree:

- reads the object shape
- creates `ElementNode` and `TextNode` instances
- renders DOM elements and text nodes
- generates scoped CSS from `style`
- tracks reactive functions
- runs hooks such as `_onInit`, `_onMount`, and `_onBeforeRemove`
- can generate HTML and CSS for SSR

## Package Boundary

The packages have different jobs:

| Package | Role |
| --- | --- |
| `@domphy/core` | object syntax, rendering, reactivity, lifecycle, SSR |
| `@domphy/theme` | design tokens and theme CSS |
| `@domphy/ui` | ready-made patches such as `button()`, `dialog()`, `tabs()` |

If you are learning Domphy from the bottom up, start with `core`, then move to `theme` and `ui`.

## Read In This Order

Use this order if you are learning core for the first time:

1. [Syntax](./syntax) - object shape, reserved keys, attributes, style, events, hooks
2. [Reactivity](./reactivity) - how listener-based updates work
3. [Lifecycle](./lifecycle) - when hooks run and what each hook is for
4. [SSR](./ssr) - `generateHTML()`, `generateCSS()`, `render()`, and `mount()`
5. [Portal](./portal) - render DOM outside the logical parent
6. [Insert Content](./patterns/insert-content) - practical patterns for adding and updating children

If you need exact method signatures, use the API Reference in the sidebar after reading these guides.
