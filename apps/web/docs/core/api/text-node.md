# TextNode

Represents a text or inline HTML node in the Domphy tree. `TextNode` is created automatically when children contain strings or numbers. You usually do not instantiate it directly.

```ts
const node: DomphyElement = {
  div: "Hello World"     // -> TextNode internally
}

const node2: DomphyElement = {
  div: 42                // -> TextNode internally
}

const node3: DomphyElement = {
  div: "<b>Bold</b>"     // -> TextNode with inline HTML
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `type` | `string` | Always `"TextNode"` |
| `parent` | `ElementNode` | Parent node |
| `text` | `string` | Current text content |
| `domText` | `ChildNode` | Mounted DOM node |

## Inline HTML

`TextNode` accepts a single-root HTML string. Multiple root elements are not supported.

```ts
"<b>Hello</b>"                  // valid
"<span class='highlight' />"    // valid
"<b>Hello</b> <i>World</i>"     // invalid: multiple roots
```

Single-root HTML is required so DOM operations like `move()` and `swap()` can keep node identity stable.

## Empty string

An empty string `""` is stored as a zero-width space (`\u200B`) so the DOM node still exists.

```ts
{ div: "" }  // renders as &#8203;
```

## `generateHTML()`

Returns the text content as an HTML string. Used for SSR.

```ts
node.generateHTML()  // "Hello World" or "&#8203;" for empty string
```
