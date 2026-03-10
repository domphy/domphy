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
| `nodeId` | `string` | Hash used for scoped CSS class generation |
| `pathId` | `string` | Hash of the node path in the tree |
| `_portal` | `((root) => Element) \| undefined` | Redirects DOM mount target when present |

The scoped CSS class is attached through `node.attributes` using the pattern ``${tagName}_${nodeId}``.

## Methods

### `render(domElement)`

Creates a DOM node and appends it to the target.

```ts
node.render(document.body)
node.render(document.getElementById("app")!)
```

### `mount(domElement)`

Hydrates onto an existing DOM element. Used for SSR.

```ts
const html = node.generateHTML()
// ... send to client ...
node.mount(document.getElementById("app")!)
```

### `remove()`

Removes this node from its parent.

```ts
node.remove()
```

### `merge(partial)`

Updates this node from a partial element descriptor.

```ts
node.merge({ style: { color: "red" }, class: "active" })
```

### `addEvent(name, callback)`

Registers a DOM event listener. Multiple callbacks are chained.

```ts
node.addEvent("click", (e, node) => console.log(node.getPath()))
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
| `Insert` | Node added to children list |
| `Mount` | DOM element created |
| `BeforeUpdate` | Before children diff |
| `Update` | After children diff |
| `BeforeRemove` | Before DOM removal — call `done()` to proceed |
| `Remove` | After DOM removal |

### `getPath()`

Returns index path from root e.g. `"0.2.1"`.

```ts
node.getPath() // "0.2.1"
```

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

