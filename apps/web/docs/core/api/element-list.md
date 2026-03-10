# ElementList

Manages the ordered list of child nodes under an `ElementNode`. Accessed via `node.children`.

```ts
node.children          // ElementList
node.children.items    // NodeItem[]
```

## Properties

| Property | Type | Description |
|---|---|---|
| `items` | `NodeItem[]` | Ordered array of child nodes (`ElementNode` or `TextNode`) |
| `owner` | `ElementNode` | The `ElementNode` that this list belongs to |

## Methods

### `insert(input, index?, updateDom?, silent?)`

Creates a new child node and inserts it at the given index. Returns the new node.

```ts
// Append at end
const created = node.children.insert({ div: "Hello" })

// Insert at specific index
const created = node.children.insert({ div: "Hello" }, 2)

// Insert without touching DOM (DOM already updated externally)
const created = node.children.insert({ div: "Hello" }, 2, false)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `input` | `DomphyElement \| string \| number \| null` | required | Element or text to insert |
| `index` | `number` | end | Position to insert at |
| `updateDom` | `boolean` | `true` | Whether to update the DOM |
| `silent` | `boolean` | `false` | Whether to suppress the `Update` hook |

Returns the created `ElementNode` or `TextNode`. Cast to `ElementNode` when you need to call methods like `.remove()`:

```ts
const toastNode = node.parent!.children.insert(Toast) as ElementNode
setTimeout(() => toastNode.remove(), 3000)
```

---

### `remove(item, updateDom?, silent?)`

Removes a specific node from the list.

```ts
node.children.remove(targetNode)

// Remove without touching DOM
node.children.remove(targetNode, false)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `item` | `NodeItem` | required | The node to remove |
| `updateDom` | `boolean` | `true` | Whether to remove from DOM |
| `silent` | `boolean` | `false` | Whether to suppress the `Update` hook |

Triggers `BeforeRemove` hook if present — removal waits for `done()` to be called.

---

### `update(inputs, updateDom?, silent?)`

Reconciles the child list against a new array of inputs. Reuses keyed nodes, inserts new ones, removes stale ones — in order.

```ts
node.children.update(newItemsArray)

// Sync logical list without touching DOM (DOM already updated externally)
node.children.update(newItemsArray, false)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `inputs` | `ElementInput[]` | required | New desired child list |
| `updateDom` | `boolean` | `true` | Whether to update the DOM |
| `silent` | `boolean` | `false` | Whether to suppress hooks |

Pass `false` for `updateDom` when an external library (e.g. SortableJS) has already updated the DOM — prevents double update.

---

### `move(fromIndex, toIndex, updateDom?, silent?)`

Moves a node from one index to another within the list.

```ts
node.children.move(0, 2)

// Move logical position only — DOM already moved externally
node.children.move(oldIndex, newIndex, false)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `fromIndex` | `number` | required | Current position |
| `toIndex` | `number` | required | Target position |
| `updateDom` | `boolean` | `true` | Whether to move in DOM |
| `silent` | `boolean` | `false` | Whether to suppress the `Update` hook |

---

### `swap(aIndex, bIndex, updateDom?, silent?)`

Swaps two nodes at the given indices.

```ts
node.children.swap(0, 1)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `aIndex` | `number` | required | Index of first node |
| `bIndex` | `number` | required | Index of second node |
| `updateDom` | `boolean` | `true` | Whether to swap in DOM |
| `silent` | `boolean` | `false` | Whether to suppress the `Update` hook |

---

### `clear(updateDom?, silent?)`

Removes all children.

```ts
node.children.clear()
```

---

### `generateHTML()`

Generates the HTML string for all child nodes. Used for Server-Side Rendering (SSR).

```ts
const html = node.children.generateHTML()
```

---

## The `updateDom` flag

All mutating methods accept `updateDom` (default `true`). Pass `false` when the DOM has already been updated by an external source — prevents double mutation.

Common case: SortableJS drag-and-drop.

```ts
Sortable.create(el, {
    onEnd(evt) {
        // SortableJS already moved the DOM node — sync logical tree only
        node.children.move(evt.oldIndex!, evt.newIndex!, false)
    }
})
```

## Common patterns

**Insert and auto-remove (toast):**

```ts
onClick: (_, node) => {
    const toastNode = node.parent!.children.insert(Toast) as ElementNode
    setTimeout(() => toastNode.remove(), 3000)
}
```

**Reactive list (state-driven):**

```ts
const items = toState<Item[]>([])

const List: DomphyElement<"ul"> = {
    ul: (listener) => items.get(listener).map(item => ({
        li: item.name,
        _key: item.id,
    }))
}
```

**Imperative reorder:**

```ts
node.children.move(from, to)
node.children.swap(a, b)
```

