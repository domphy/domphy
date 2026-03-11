# @domphy/core

Domphy runtime for DOM rendering, reactivity, SSR, and CSS-in-JS using plain JavaScript objects.

No JSX, no compiler, no virtual DOM.

## Install

```bash
npm install @domphy/core
```

## Quick Example

```ts
import { ElementNode, toState } from "@domphy/core"

const count = toState(0)

const App = {
  div: [
    {
      p: (listener) => `Count: ${count.get(listener)}`,
    },
    {
      button: "Increment",
      onClick: () => count.set(count.get() + 1),
    },
  ],
}

new ElementNode(App).render(document.body)
```

## What It Includes

- plain-object element syntax
- fine-grained listener-based reactivity
- DOM rendering
- SSR with `generateHTML()` and `generateCSS()`
- `mount()` for attaching to existing SSR output
- nested CSS-in-JS through `style`

## SSR

```ts
const node = new ElementNode(App)

const html = node.generateHTML()
const css = node.generateCSS()

new ElementNode(App).mount(document.getElementById("app")!)
```

## Docs

- [Core guide](https://www.domphy.com/docs/core/)
- [ElementNode API](https://www.domphy.com/docs/core/api/element-node)
- [Reactivity](https://www.domphy.com/docs/core/reactivity)
