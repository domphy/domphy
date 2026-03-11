# Lifecycle

Hooks fire in a fixed linear sequence. Each step exposes more of the node as it progresses.

<img alt="Lifecycle Hooks" src="/figures/hooks.png" width="500" style="display:block;margin:auto" />

```ts
import { DomphyElement, merge } from "@domphy/core"

const App: DomphyElement<"div"> = {
  div: "Hello",

  _onSchedule: (node, rawElement) => {
    const theme = node.getContext("theme")
    merge(rawElement, {
      style: {
        color: theme === "dark" ? "#fff" : "#000",
      },
    })
  },

  _onInsert: (node) => {
    const index = node.parent!.children.items.indexOf(node)
    node.setMetadata("index", index)
  },

  _onMount: (node) => {
    const observer = new ResizeObserver(() => {
      console.log(node.domElement!.offsetWidth)
    })

    observer.observe(node.domElement!)
    node.addHook("BeforeRemove", () => observer.disconnect())
  },

  _onBeforeUpdate: (node, rawChildren) => {
    console.log("incoming:", rawChildren.length)
  },

  _onUpdate: (node) => {
    console.log("children updated:", node.children.items.length)
  },

  _onBeforeRemove: (node, done) => {
    node.domElement!
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 })
      .onfinish = done
  },

  _onRemove: () => {
    console.log("removed")
  },
}
```

## Hook Order

| Hook | When | What's available |
| --- | --- | --- |
| `_onSchedule(node, raw)` | Before parsing, while the raw element can still be changed | `parent`, `_context`, `_metadata`, mutable `raw` |
| `_onInit(node)` | After parsing, before insertion | node properties, no siblings yet |
| `_onInsert(node)` | Added to the parent child list | siblings, position in tree |
| `_onMount(node)` | DOM element created and connected to the node | `domElement` and all node properties |
| `_onBeforeUpdate(node, rawChildren)` | Before a child update cycle applies new children | current node, current DOM, incoming raw children |
| `_onUpdate(node)` | After the update cycle finishes | updated children and `domElement` |
| `_onBeforeRemove(node, done)` | Before removal, must call `done()` | `domElement`, current runtime state |
| `_onRemove(node)` | After the node is fully removed | node instance after removal work completes |

`_onSchedule` is the right place to apply context-aware patches. Unlike inline `$: [patches]`, it can read parent context before parsing begins.

See also [ElementNode API](./api/element-node).
