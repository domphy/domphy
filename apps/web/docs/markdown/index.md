---
title: "@domphy/markdown"
description: "Parse Markdown into Domphy element trees for SSR/SSG."
---

# Markdown

`@domphy/markdown` parses Markdown into **Domphy element trees** — plain objects like `{ h1: ... }`, `{ ul: [...] }`, `{ pre: [{ code: ... }] }` — so the result can be server-rendered by `@domphy/core` / `@domphy/app` with no client runtime.

It uses [remark](https://github.com/remarkjs/remark) (unified) to parse Markdown into an mdast AST, then walks the tree and emits **semantic tags only** — no inline typography styles. Styling stays the consumer's job, applied through patches and theme, exactly like hand-written Domphy.

::: tip
This docs site is built on `@domphy/markdown`. The `@domphy/press` engine passes custom remark plugins (containers, includes) to `createMarkdown`, then renders the resulting Domphy tree to static HTML via `@domphy/app`.
:::

## What you get

- Headings with a slug `id` for anchors, plus a collected table of contents
- Paragraphs, bold / italic / strikethrough, inline code
- Fenced code blocks (with a pluggable highlighter)
- Links, images, blockquotes, ordered / unordered / nested lists (`_key` on list items)
- GFM tables, horizontal rules, raw inline / block HTML pass-through
- YAML frontmatter splitting
- Optional LaTeX math (`$...$` / `$$...$$`) via `remark-math`
- Custom remark/unified plugin support
- `onCustom` hook for non-standard mdast node types

## Install

::: code-group
```bash [NPM]
npm install @domphy/markdown @domphy/core
```
```bash [pnpm]
pnpm add @domphy/markdown @domphy/core
```
:::

`@domphy/core` is a peer dependency.

## parseMarkdown

`parseMarkdown(md, options?)` returns `{ frontmatter, body, toc }`:

```ts
import { ElementNode } from "@domphy/core"
import { parseMarkdown } from "@domphy/markdown"

const source = `---
title: Hello
---
# Hello World

A paragraph with **bold** and a [link](https://domphy.com).

- one
- two
`

const { frontmatter, body, toc } = parseMarkdown(source)

frontmatter // { title: "Hello" }
toc         // [{ level: 1, text: "Hello World", slug: "hello-world" }]

// Render the body to HTML with @domphy/core
const html = new ElementNode({ div: body }).generateHTML()
```

| Field | Type | Description |
| --- | --- | --- |
| `frontmatter` | `Record<string, unknown>` | Parsed YAML frontmatter, or `{}` when none is present. |
| `body` | `DomphyElement[]` | The document as an array of Domphy elements. |
| `toc` | `TocEntry[]` | Flat list of headings: `{ level, text, slug }`. |

## markdownToDomphy

A convenience wrapper when you only need the body element array:

```ts
import { markdownToDomphy } from "@domphy/markdown"

const body = markdownToDomphy("# Title\n\nText.")
```

It is exactly `parseMarkdown(md, options).body`.

## Options

All options are accepted by both `parseMarkdown` and `createMarkdown`:

```ts
parseMarkdown(md, {
  // Highlight fenced code. `info` is the full info string ("ts :line-numbers").
  // Return inner HTML for the <code>, or a DomphyElement to wrap the block.
  highlight: (code, info) => `<span class="tok">${code}</span>`,

  // Custom heading slug function (used for anchors and the toc).
  anchorSlugify: (text) => text.toLowerCase().replace(/\s+/g, "-"),

  // Additional remark/unified plugins.
  plugins: [remarkDirective],

  // Handle mdast node types the core walker doesn't recognise.
  onCustom: (node, helper) => {
    if (node.type === "containerDirective") return { div: helper.walkChildren(node) }
    return null
  },
})
```

| Option | Type | Description |
| --- | --- | --- |
| `highlight` | `(code: string, info: string) => string \| DomphyElement \| null \| undefined` | Highlighter for fenced code blocks. A returned string is used as `<code>` inner HTML; a `DomphyElement` replaces the entire block. |
| `anchorSlugify` | `(text: string) => string` | Slug function for heading `id`s and toc entries. Defaults to `defaultSlugify`. |
| `plugins` | `RemarkPlugin[]` | Additional remark/unified plugins to apply to the processor. |
| `onCustom` | `(node, helper) => DomphyElement \| string \| null` | Handle mdast nodes the walker doesn't know (e.g. directives from `remark-directive`). The `helper` arg provides `walkChildren(node)` for recursive conversion. |

## createMarkdown — reusable parser

`createMarkdown(options?)` builds a reusable `MarkdownInstance` with a shared remark processor. Use it when you parse many documents (saves processor setup cost per document) or need to pass it to a pipeline:

```ts
import { createMarkdown } from "@domphy/markdown"

const parser = createMarkdown({
  highlight: (code, info) => myHighlighter(code, info),
})

const { frontmatter, body, toc } = parser.parse(source)
// or
const elements = parser.toDomphy(source)
```

`MarkdownInstance` interface:

| Method | Description |
| --- | --- |
| `parse(md)` | Same as `parseMarkdown(md, options)`. |
| `toDomphy(md)` | Same as `markdownToDomphy(md, options)`. |

### Math support

Pass `math: true` to enable LaTeX math parsing. Requires `remark-math`:

```bash
pnpm add remark-math
```

```ts
const parser = createMarkdown({ math: true })
const { body } = parser.parse("Inline $E = mc^2$ and block:\n\n$$\\int_0^\\infty e^{-x}dx = 1$$")
```

The raw LaTeX is preserved in the element content as plain text — so a CDN-loaded KaTeX/MathJax auto-render extension can process it client-side. No bundled renderer is included.

### Custom remark plugins

`plugins` accepts any unified-compatible remark plugin:

```ts
import remarkDirective from "remark-directive"
import { createMarkdown } from "@domphy/markdown"

const parser = createMarkdown({
  plugins: [remarkDirective],
  onCustom: (node, helper) => {
    if (node.type === "containerDirective" && node.name === "tip") {
      return { div: helper.walkChildren(node), class: "callout callout-tip" }
    }
    return null
  },
})

const { body } = parser.parse("::: tip\nPro tip here.\n:::")
```

## Custom pipelines (advanced)

For maximum control — running your own remark instance and converting the mdast tree yourself — use the lower-level `walkMdast`:

```ts
import { remark } from "remark"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { splitFrontmatter, walkMdast } from "@domphy/markdown"
import { createUniqueSlugger, defaultSlugify } from "@domphy/markdown"

const { frontmatter, content } = splitFrontmatter(source)

const processor = remark().use(remarkGfm).use(remarkMath)
const tree = processor.parse(content)
processor.runSync(tree, content)

const toc = []
const slug = createUniqueSlugger(defaultSlugify)
const body = walkMdast(tree, { highlight: myHighlighter, slug, toc })
```

This is how `@domphy/press` works: it wires its own remark pipeline (custom containers, file includes) and then calls `walkMdast` to produce the Domphy tree.

## API reference

| Export | Description |
| --- | --- |
| `parseMarkdown(md, options?)` | Parse markdown string → `{ frontmatter, body, toc }` |
| `markdownToDomphy(md, options?)` | Parse markdown string → `DomphyElement[]` (body only) |
| `createMarkdown(options?)` | Create a reusable `MarkdownInstance` `{ parse, toDomphy }` |
| `walkMdast(root, options?)` | Walk an mdast Root node → `DomphyElement[]` (low-level) |
| `splitFrontmatter(md)` | Extract YAML frontmatter → `{ frontmatter, content }` |
| `createUniqueSlugger(slugify?)` | Stateful slugger that de-duplicates repeated heading slugs |
| `defaultSlugify` | Default slug: lowercase + replace whitespace with `-` |
