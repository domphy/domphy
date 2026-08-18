# TextNode

Represents a text node in the Domphy tree. `TextNode` is created automatically when children contain strings or numbers. You usually do not instantiate it directly.

```ts
const node: DomphyElement = {
  div: "Hello World"     // -> TextNode internally
}

const node2: DomphyElement = {
  div: 42                // -> TextNode internally
}

const node3: DomphyElement = {
  div: "<b>Bold</b>"     // -> TextNode; renders the literal characters <b>Bold</b>
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `type` | `string` | Always `"TextNode"` |
| `parent` | `ElementNode` | Parent node |
| `text` | `string` | Current text content |
| `html` | `boolean` | `true` only for a `rawHtml()` child |
| `domText` | `ChildNode` | Mounted DOM node (first root when `rawHtml()` parses to several siblings) |

## A string child is always text

Markup in a plain string is **escaped**, never parsed — on the client (`createTextNode`) and in SSR output alike. This is what keeps user-supplied values (a comment, a title, a form field) from becoming live DOM:

```ts
{ div: userComment }   // "<img src=x onerror=alert(1)>" renders as visible text
```

## Inline HTML: `rawHtml()`

Rendering a string as markup is an explicit opt-in via `rawHtml()` from `@domphy/core`:

```ts
import { rawHtml } from "@domphy/core"

{ div: rawHtml("<b>Bold</b>") }   // -> a real <b> element
```

Only ever wrap markup you control (a Markdown renderer's output, a syntax highlighter, a generated SVG). `rawHtml()` still strips `<script>` elements, `on*` handler attributes and `javascript:` URLs, but that is defense in depth — it is not a full sanitizer, and it cannot make untrusted input safe.

`rawHtml()` accepts a single-root **or multi-root** HTML string. Every parsed root is inserted as a sibling; `domText` stays the first root (the slot anchor). `children.move()` / `children.swap()` / removal treat those roots as one child group, so identity stays stable.

```ts
rawHtml("<b>Hello</b>")                  // one root
rawHtml("<span class='highlight' />")    // one root
rawHtml("<b>Hello</b><i>World</i>")      // two roots — both render
rawHtml("<b>a</b> <i>b</i>")             // two element roots (leading/trailing whitespace is trimmed)
```

SSR `generateHTML()` and the client parse emit the same sanitized markup, so a multi-root child hydrates without drift. Switching between multi-root HTML, single-root HTML, and plain text rebuilds the group.

A reactive child may return either form, and switching between them rebuilds the node:

```ts
{ div: (l) => trusted.get(l) ? rawHtml(markup.get(l)) : plain.get(l) }
```

## Empty string

An empty string `""` is stored as a zero-width space (`U+200B`) so the DOM node still exists.

```ts
{ div: "" }  // renders as &#8203;
```

## `generateHTML()`

Returns the text content as an HTML string, escaped unless the node came from `rawHtml()`. Used for SSR.

```ts
node.generateHTML()  // "Hello World" or "&#8203;" for empty string
```
