---
title: "Syntax Reference"
description: "How every markdown construct maps to Domphy elements in @domphy/markdown."
---

# Syntax Reference

This page documents every markdown syntax construct and the exact Domphy element shape `@domphy/markdown` produces for each one. Use it to understand what `body` contains and how to write patches or styles that target specific elements.

## Headings

ATX headings (`#` through `######`) become `h1` through `h6` with an `id` attribute derived from the heading text:

```markdown
# Level 1
## Level 2
### Level 3
```

```ts
// body
[
  { h1: ["Level 1"], id: "level-1" },
  { h2: ["Level 2"], id: "level-2" },
  { h3: ["Level 3"], id: "level-3" },
]
```

The `id` is the slug produced by `defaultSlugify` (or your `anchorSlugify` option). Duplicate heading text gets a numeric suffix: first occurrence keeps the base slug, subsequent ones get `-1`, `-2`, and so on.

```markdown
# Intro

# Intro
```

```ts
[
  { h1: ["Intro"], id: "intro" },
  { h1: ["Intro"], id: "intro-1" },
]
```

## Paragraphs

Blocks of text become `p` elements. The children array holds plain-text strings and any inline elements:

```markdown
A paragraph with **bold**, _italic_, and `code`.
```

```ts
[{
  p: [
    "A paragraph with ",
    { strong: ["bold"] },
    ", ",
    { em: ["italic"] },
    ", and ",
    { code: "code" },
    ".",
  ],
}]
```

## Inline emphasis

| Markdown | Domphy element |
| --- | --- |
| `**bold**` or `__bold__` | `{ strong: [...children] }` |
| `_italic_` or `*italic*` | `{ em: [...children] }` |
| `~~struck~~` | `{ s: [...children] }` |
| `` `inline code` `` | `{ code: "text" }` |

Emphasis elements can be nested: `**_bold italic_**` becomes `{ strong: [{ em: ["bold italic"] }] }`.

## Links

```markdown
[Domphy](https://domphy.dev "Homepage")
```

```ts
{
  a: ["Domphy"],
  href: "https://domphy.dev",
  title: "Homepage",
  target: "_blank",
  rel: "noopener noreferrer",
}
```

All attributes emitted by the mdast walker are copied as element properties. Absolute `http://`/`https://` links automatically get `target: "_blank"` and `rel: "noopener noreferrer"`; relative and anchor (`#...`) links do not. Auto-linked bare URLs (enabled by default via GFM) produce the same shape.

## Images

```markdown
![A diagram](/img/diagram.png "Figure 1")
```

```ts
{ img: null, src: "/img/diagram.png", alt: "A diagram", title: "Figure 1" }
```

The `img` property is `null` because images are void elements. The `alt` text is extracted from the image's inline token children (markup stripped to plain text).

## Unordered lists

```markdown
- one
- two
- three
```

```ts
{
  ul: [
    { li: ["one"],   _key: 0 },
    { li: ["two"],   _key: 1 },
    { li: ["three"], _key: 2 },
  ],
}
```

Each `li` element carries a `_key` number equal to its zero-based position among siblings. This gives Domphy stable keys for list diffing. Items whose content is a tight paragraph (no blank line between items) expose the text directly as `li` children; items separated by blank lines get a `p` child inside `li`.

## Ordered lists

```markdown
1. first
2. second
3. third
```

```ts
{
  ol: [
    { li: ["first"],  _key: 0 },
    { li: ["second"], _key: 1 },
    { li: ["third"],  _key: 2 },
  ],
}
```

## Nested lists

```markdown
- parent
  - child one
  - child two
```

```ts
{
  ul: [
    {
      li: [
        "parent",
        {
          ul: [
            { li: ["child one"], _key: 0 },
            { li: ["child two"], _key: 1 },
          ],
        },
      ],
      _key: 0,
    },
  ],
}
```

The nested list appears as the last child inside its parent `li`. Ordered and unordered lists can be mixed at any depth.

## Blockquotes

```markdown
> Quoted text.
> Second line.
```

```ts
{
  blockquote: [
    { p: ["Quoted text. Second line."] },
  ],
}
```

Blockquotes nest: `>> deeply quoted` produces `{ blockquote: [{ blockquote: [{ p: [...] }] }] }`.

## Fenced code blocks

````markdown
```ts
const x: number = 42
```
````

```ts
{
  pre: [{
    code:         "const x: number = 42\n",
    dataLanguage: "ts",
    class:        "language-ts",
  }],
}
```

- `code` holds the raw, un-escaped source text when no highlighter is supplied — `@domphy/core` escapes it once at render time, so markdown does not pre-escape it.
- `dataLanguage` is Domphy's camelCase form of the `data-language` attribute, set to the fence's language identifier.
- `class` is set to `"language-{lang}"` so CSS-based highlighters can target it.

When a [highlighter](/docs/markdown/highlighting) is provided, `code` contains the highlighted output (a string of inner HTML or a `DomphyElement`) instead of the raw text.

## Indented code blocks

Four-space-indented code blocks produce the same `pre > code` shape but carry no language metadata:

```markdown
    const x = 1;
    const y = 2;
```

```ts
{
  pre: [{ code: "const x = 1;\nconst y = 2;\n" }],
}
```

`dataLanguage` and `class` are absent because indented code blocks carry no language annotation.

## GFM tables

```markdown
| Name  | Age |
| ----- | --- |
| Alice | 30  |
| Bob   | 25  |
```

```ts
{
  table: [
    {
      thead: [{
        tr: [
          { th: ["Name"] },
          { th: ["Age"] },
        ],
      }],
    },
    {
      tbody: [
        { tr: [{ td: ["Alice"] }, { td: ["30"] }] },
        { tr: [{ td: ["Bob"] },   { td: ["25"] }] },
      ],
    },
  ],
}
```

The full `table > thead/tbody > tr > th/td` structure is preserved.

### Column alignment

Alignment markers (`:-`, `:-:`, `-:`) add a `style` object to each cell in that column:

```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| L    |   C    |     R |
```

```ts
{ th: ["Left"],   style: { textAlign: "left" } }
{ th: ["Center"], style: { textAlign: "center" } }
{ th: ["Right"],  style: { textAlign: "right" } }
```

Cells without an alignment marker have no `style` property.

## Horizontal rule

```markdown
---
```

```ts
{ hr: null }
```

`hr` is `null` because `<hr>` is a void element.

## Line breaks

A regular newline inside a paragraph becomes a **soft break** — rendered as a single space:

```markdown
line one
line two
```

```ts
{ p: ["line one", " ", "line two"] }
```

Two trailing spaces followed by a newline produce a **hard break** — a void `br` element:

```markdown
line one  
line two
```

```ts
{ p: ["line one", { br: null }, "line two"] }
```

## Task lists

Enabled by default (GFM task lists, via `remark-gfm`) — no option needed. List items beginning with `[ ]` (unchecked) or `[x]` / `[X]` (checked) get a disabled `<input type="checkbox">` prepended:

```markdown
- [x] Completed item
- [ ] Pending item
```

```ts
{
  ul: [
    {
      li: [
        { input: null, type: "checkbox", disabled: true, checked: true },
        "Completed item",
      ],
      _key: 0,
    },
    {
      li: [
        { input: null, type: "checkbox", disabled: true },
        "Pending item",
      ],
      _key: 1,
    },
  ],
}
```

The `checked` property is present only on checked items; it is absent (not `false`) on unchecked ones.

## Math

`createMarkdown({ math: true })` only installs the `remark-math` plugin so `$...$` and `$$...$$` are *parsed* into `math`/`inlineMath` nodes — it does not by itself produce the class-wrapped shape below. Pair it with an `onCustom` handler to render those nodes:

```ts
import remarkMath from "remark-math"
import { createMarkdown } from "@domphy/markdown"

const parser = createMarkdown({
  plugins: [remarkMath],
  onCustom: (node) => {
    if (node.type === "math") return { div: node.value, class: "math math-display" }
    if (node.type === "inlineMath") return { span: node.value, class: "math math-inline" }
    return null
  },
})
```

Without an `onCustom` handler, math/inlineMath nodes fall through the default walker branch and come out as bare, unwrapped strings. See [overview](/docs/markdown/#math-support) for CDN setup.

### Inline math

```markdown
The formula $E = mc^2$ is famous.
```

```ts
{
  p: [
    "The formula ",
    { span: "E = mc^2", class: "math math-inline" },
    " is famous.",
  ],
}
```

### Display math

````markdown
$$
\int_0^\infty e^{-x}\,dx = 1
$$
````

```ts
{ div: "\\int_0^\\infty e^{-x}\\,dx = 1\n", class: "math math-display" }
```

The raw LaTeX is stored verbatim. KaTeX (or MathJax) processes `.math` elements at runtime. Both examples above assume the `onCustom` handler shown earlier — this is what `math: true` is meant to be paired with.

## Raw HTML

### Block HTML

A block of raw HTML is passed through as a bare string in the body array — no `div` wrapper is added. When Domphy renders a body array, a raw HTML string is emitted verbatim (see `@domphy/core`'s HTML-string handling):

```markdown
<figure>
  <img src="/chart.png" alt="Chart">
  <figcaption>Monthly visits</figcaption>
</figure>
```

```ts
[
  "<figure>\n  <img src=\"/chart.png\" alt=\"Chart\">\n  <figcaption>Monthly visits</figcaption>\n</figure>",
]
```

### Inline HTML

Raw HTML inline is a per-fragment operation: each open or close tag fragment is passed through as a bare string (no `span` wrapper). The walker does not reconstruct the nested element tree from raw inline HTML:

```markdown
Text with <strong>bold</strong> inline.
```

```ts
{
  p: [
    "Text with ",
    "<strong>",
    "bold",
    "</strong>",
    " inline.",
  ],
}
```

For content that needs inline styling, prefer standard markdown emphasis syntax. Reserve raw HTML for block-level elements that have no markdown equivalent (e.g. `<figure>`, `<details>`, `<video>`).
