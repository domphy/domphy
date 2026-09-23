# ElementNode

Core node representing a single HTML element in the Domphy tree.

```ts
import { ElementNode } from "@domphy/core"

const node = new ElementNode({ div: "Hello World" })
node.render(document.body)
```

## Constructor

```ts
new ElementNode(domphyElement: DomphyElement, parent?: ElementNode | null)
```

## Properties

| Property | Type | Description |
|---|---|---|
| `type` | `string` | Always `"ElementNode"` |
| `parent` | `ElementNode \| null` | Parent node. `null` if root |
| `tagName` | `TagName` | HTML tag name e.g. `"div"` |
| `children` | `ElementList` | Child nodes |
| `styles` | `StyleList` | Scoped CSS styles |
| `attributes` | `AttributeList` | HTML attributes |
| `domElement` | `HTMLElement \| null` | Mounted DOM element |
| `key` | `string \| number \| null` | Identity key for diffing |
| `nodeId` | `string` | Per-instance id, assigned in document order (`"n0"`, `"n1"`, …) |
| `scopeClass` | `string \| null` | The class this node's CSS rules are scoped to, or `null` when it declares no style |
| `_portal` | `((root) => Element) \| undefined` | Redirects DOM mount target when present |

### Ids and the scope class

`nodeId` identifies a node's position in **its own tree**, assigned in construction order. Two mounts of the same component inside one tree get different ids, which is what makes ids derived from it (`domphy-popover-${nodeId}`, `aria-controls`) unique on a page.

The counter belongs to the **root** of each tree, not to the module, and children draw from their root. An id is therefore a function of the tree and nothing else: an unlabelled root always numbers from `n0`, whatever the process rendered before it. That is what lets a static-site build render many pages from one process, or a server handle many requests from one, and still serve each page the ids its own hydrating browser computes from scratch. There is no reset call and no request-scoped state.

Because every root numbers from zero, several roots in **one document** need a discriminator, and `_idPrefix` on the root descriptor is the only one — there is deliberately no automatic scheme, since anything automatic would have to count how much work the process had done, which is the dependency this design exists to remove. This is React's rule for `useId`: ids are a function of the tree, and rendering several independent apps into one page means passing `identifierPrefix`.

```ts
// Two roots sharing a document — a streamed shell and its content.
new ElementNode({ div: [shell],   _idPrefix: "s" })   // ids: sn0, sn1, …
new ElementNode({ div: [content], _idPrefix: "c" })   // ids: cn0, cn1, …
```

`@domphy/app` does this for the streaming path; `renderToString()` and `hydrate()` each build one unlabelled root, so their ids match without any prefix. Mounting several independent trees into one page yourself — a demo harness, a page of embedded widgets — means giving each root its own prefix, or ids built on `nodeId` (`domphy-popover-${nodeId}`, `aria-controls`) will repeat across them.

`scopeClass` identifies the **style**. It is a hash of the node's resolved CSS rule text, so every node whose computed style is identical lands on the same class and shares one set of CSSOM rules — a list of 200 identically styled rows has one rule, not 200. A node that declares no style gets no class at all.

When a declaration actually changes (a reactive value moves, a patch writes a new value), the node leaves the shared class for a private one and keeps its own rule from then on: the shared class is a promise that the rules under it are exactly the text that was hashed, and other nodes are relying on it. That private class is numbered per document rather than per tree — it only ever happens against a live stylesheet, so it is never serialized and never has to match a server render, which frees it to stay unique across separately-mounted roots.

## Methods

### `render(domElement)`

Creates a DOM node and appends it to the target.

```ts
node.render(document.body)
node.render(document.getElementById("app")!)
```

### `mount(domElement, domStyle?)`

Hydrates onto an existing DOM element. Used for SSR.

`generateHTML()` emits **this node's own root tag**, so `mount()` must receive that element — not a wrapper. Parse the HTML into a host, then mount onto `host.firstElementChild`. In DEV, `mount()` warns when the target tag does not match `this.tagName`.

```ts
const html = node.generateHTML()
const css = node.generateCSS()
// ... send to client ...
const host = document.getElementById("app")!
host.innerHTML = html
const domStyle = document.getElementById("domphy-style") as HTMLStyleElement
node.mount(host.firstElementChild as HTMLElement, domStyle)
```

When doing SSR, render CSS into `<style id="domphy-style">...</style>` on the server, then pass that same style element to `mount()` on the client.

### `remove()`

Removes this node from its parent.

```ts
node.remove()
```

### `patch(rawElement)`

Replaces the node's element descriptor in-place. Triggers a reconciliation pass to apply the new props/children/style to the DOM without unmounting.

```ts
node.patch({ div: "updated content", class: "active" })
```

| Parameter | Type | Description |
|---|---|---|
| `rawElement` | `DomphyElement` | New element descriptor to apply |

Unlike `merge()` which deep-merges, `patch()` replaces the full descriptor. Used internally by list reconciliation (a reactive list/content function reusing a node by key or position) and explicit update flows.

`patch()` reconciles the node's own **flat** style properties (e.g. `color`, `padding`) — properties present before but absent from the new descriptor are removed, matching how attributes are reconciled. **Nested selector blocks are not reconciled** (`&:hover`, `@media`, `@keyframes`, `@font-face`): they are set once at construction and assumed stable across reuse. A value that must change after construction under a nested selector needs its own reactive function (`color: (l) => …`) rather than a plain value recomputed by the caller.

### `merge(partial)`

Updates this node from a partial element descriptor.

```ts
node.merge({ style: { color: "red" }, class: "active" })
```

### `addEvent(name, callback)`

Registers a DOM event listener. Multiple callbacks are chained.

```ts
node.addEvent("click", (e, node) => console.log(node.tagName))
```

### `addHook(name, callback)`

Registers a lifecycle hook. Multiple callbacks are chained.

```ts
node.addHook("Mount", (node) => console.log("mounted"))
node.addHook("BeforeRemove", (node, done) => {
  animate(node.domElement).then(done)
})
```

| Hook | Trigger |
|---|---|
| `Schedule` | `(node, rawElement) => void` — fired before parsing; use to apply context-aware patches via `merge(rawElement, ...)` |
| `Init` | `(node) => void` — fired after parsing, before insertion into the tree |
| `Insert` | Node added to children list |
| `Mount` | DOM element created |
| `BeforeUpdate` | Before children diff |
| `Update` | After children diff |
| `BeforeRemove` | Before DOM removal — call `done()` to proceed |
| `Remove` | After DOM removal |
| `Error` | Caught error from a reactive child (`(node, error, reset) => void`) — call `reset()` to clear children and render fallback |

### `getRoot()`

Returns the root node of the tree.

```ts
const root = node.getRoot()
```

### `getContext(name)` / `setContext(name, value)`

Inherited context — walks up the tree to find the nearest value.

```ts
// Parent
node.setContext("theme", "dark")

// Any descendant
const theme = node.getContext("theme") // "dark"
```

### `getMetadata(name)` / `setMetadata(key, value)`

Local metadata — not inherited by children.

```ts
node.setMetadata("id", "user-123")
node.getMetadata("id") // "user-123"
```

### `getBehavior(key)`

Looks up a per-node behavior instance attached via `behavior()`, walking up through ancestors (same pattern as `getContext`/`getMetadata`) — a behavior is declared on the element that owns the concern, but the event that needs it often fires on a descendant.

```ts
import { behavior } from "@domphy/core"

const anchorPartial = behavior("floating", attachFloating, { open: openState })

// later, from a live-rebound trigger event handler:
onClick: (e, node) => node.getBehavior("floating")?.show()
```

Returns `undefined` if the key was never declared on this node or an ancestor, or was declared but hasn't attached yet (construction-time, before `Mount`).

### `generateHTML()`

Generates HTML string. Used for SSR.

```ts
const html = node.generateHTML()
// "<div class="div_abc123">Hello</div>"
```

### `generateCSS()`

Generates CSS string for this node and all descendants. Used for SSR.

```ts
const css = node.generateCSS()
```

