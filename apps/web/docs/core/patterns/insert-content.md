# Insert Content

There are five common patterns for adding content. Each has a distinct trade-off.

## 1. CSS `::before` / `::after`

For purely decorative or static text content, use pseudo-elements in style — no extra DOM nodes.

```ts
{
  div: "Saved",
  style: {
    "&::before": { content: '"✓ "' },
    "&::after":  { content: '" !"' },
  },
}
```

Best for icons, decorative symbols, labels, badges, and separators.

---

## 2. Declare In Tree + Hide

Declare the element upfront and toggle its visibility via state. The element is always in the logical tree.

```ts
const open = toState(false)

const App = {
  div: [
    { button: "Open", onClick: () => open.set(true) },
    {
      dialog: "...",
      $: [dialog({ open })],
    },
  ],
}
```

Best for singletons that should preserve state between shows: dialog, drawer, popover, dropdown.

---

## 3. Imperative Insert

Insert a new element at runtime. Call `.remove()` when done.

```ts
const successToast: DomphyElement<"div"> = {
  div: "Saved successfully",
  $: [toast({ placement: "bottom-left" })],
}

const App = {
  div: [{
    button: "Show Toast",
    $: [button()],
    onClick: (_, node) => {
      const toastNode = node.parent!.children.insert(successToast) as ElementNode
      setTimeout(() => toastNode.remove(), 3000)
    },
  }],
}
```

Best for ephemeral elements that are created, shown, then destroyed: toast, notification, snackbar.

---

## 4. Reactive Children

Derive the child list from state. The parent re-diffs its children whenever state changes.

```ts
const items = toState<Item[]>([])

const App = {
  ul: (listener) => items.get(listener).map(item => ({
    li: item.name,
    _key: item.id,
  })),
}
```

Best for lists driven by external data: filtered results, rows, tabs, repeated structures.

Avoid this for single-element toggling when a simple declare-and-hide or imperative insert is clearer.

---

## 5. DOM API In `_onMount`

Use browser DOM APIs directly inside `_onMount` to insert content outside the Domphy tree.

```ts
{
  div: "App",
  _onMount: (node) => {
    const style = document.createElement("style")
    style.textContent = `.theme { color: red }`
    document.head.appendChild(style)

    node.addHook("Remove", () => style.remove())
  },
}
```

Best for nodes outside the app root such as `<head>` or third-party containers. Do not use this to manage content inside the Domphy tree.

## Summary

| Pattern | Best for | DOM nodes |
| --- | --- | --- |
| CSS `::before`/`::after` | Decorative icons, labels, separators | None |
| Declare + hide | Dialog, drawer, popover | Always present |
| Imperative insert | Toast, notification | Created on demand |
| Reactive children | Lists from data | Created on demand |
| DOM API in `_onMount` | Outside root — `<head>`, third-party | Unmanaged |
