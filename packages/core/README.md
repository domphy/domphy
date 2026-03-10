# @domphy/core

DOM rendering with fine-grained reactivity, CSS-in-JS, and SSR — using plain JavaScript objects. No JSX, no compiler, no virtual DOM.

```bash
npm install @domphy/core
```

## How it works

A Domphy element is a plain object. The HTML tag is the key; its value is the content.

```ts
import { ElementNode, toState } from "@domphy/core"

const count = toState(0)

const App = {
  div: [
    {
      p: (listener) => `Count: ${count.get(listener)}`
      // count.get(listener) — returns value AND subscribes.
      // When count changes, only this text node re-renders.
    },
    {
      button: "Increment",
      onClick: () => count.set(count.get() + 1),
      style: {
        padding: "4px 16px",
        borderRadius: "6px",
        "&:hover": { opacity: 0.8 }
      }
    }
  ]
}

new ElementNode(App).render(document.body)
```

## SSR

Same element definition on server and client — no duplication.

```ts
// server.js
const node = new ElementNode(App)
const page = `<html>
  <head><style>${node.generateCSS()}</style></head>
  <body><div id="app">${node.generateHTML()}</div></body>
</html>`

// client.js
new ElementNode(App).mount(document.getElementById("app"))
```

## Patches

A Patch is a function returning a partial element descriptor, applied via `$`. Element properties always override patch defaults — the element owns the final result.

```ts
import { merge } from "@domphy/core"

function rounded() {
  return (base) => merge(base, {
    style: { borderRadius: "8px", padding: "8px 16px" }
  })
}

const btn = { button: "Click", $: [rounded()] }
```

---

**[Full documentation →](https://www.domphy.com/docs/core/)**
