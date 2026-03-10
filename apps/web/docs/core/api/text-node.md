# TextNode

Represents a text or inline HTML node in the Domphy tree. Created automatically when children contain strings or numbers — not instantiated directly.

```ts
const node: DomphyElement = {
  div: "Hello World"     // → TextNode internally
}

const node: DomphyElement = {
  div: 42                // → TextNode internally
}

const node: DomphyElement = {
  div: "<b>Bold</b>"     // → TextNode with inline HTML
}
```

## Inline HTML

`TextNode` accepts a single-root HTML string. Multiple root elements are not supported.

```ts
✅ "<b>Hello</b>"
✅ "<span class='highlight'>text</span>"
❌ "<b>Hello</b> <i>World</i>"   // two roots — not supported
```

> Single-root constraint is required for DOM operations like `move()` and `swap()` to work correctly.

## Empty string

An empty string `""` is stored as a zero-width space (`\u200B`) to preserve the DOM node.

```ts
{ div: "" }  // renders as &#8203; — node exists but is invisible
```

## Properties

| Property | Type | Description |
|---|---|---|
| `type` | `string` | Always `"TextNode"` |
| `parent` | `ElementNode` | Parent node |
| `text` | `string` | Current text content |
| `domText` | `ChildNode` | Mounted DOM text node |

## `generateHTML()`

Returns the text content as an HTML string. Used for SSR.

```ts
node.generateHTML()  // "Hello World" or "&#8203;" for empty string
```

