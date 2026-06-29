# @domphy/markdown

Parse Markdown into [Domphy](https://domphy.com) element trees so it can be server-rendered by `@domphy/core` / `@domphy/app`.

It uses [remark](https://github.com/remarkjs/remark) (unified) to parse Markdown into an mdast AST, then walks the tree and builds plain Domphy element objects (`{ h1: ... }`, `{ ul: [...] }`, `{ pre: [{ code: ... }] }`, ...) — semantic tags only, no inline typography styles. Styling stays the consumer's job via patches and theme.

Features:

- Headings with slug `id` for anchors, plus a collected table of contents
- Paragraphs, bold / italic / strikethrough, inline code
- Fenced code blocks with a pluggable highlighter
- Links, images, blockquotes, ordered / unordered / nested lists (`_key` on list items)
- GFM tables, horizontal rules, raw inline / block HTML pass-through
- YAML frontmatter splitting
- Custom remark plugin support
- Optional LaTeX math (requires `remark-math`)

## Install

```bash
npm install @domphy/markdown @domphy/core
```

`@domphy/core` is a peer dependency.

## Usage

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

Just need the elements?

```ts
import { markdownToDomphy } from "@domphy/markdown"

const body = markdownToDomphy("# Title\n\nText.")
```

## Options

```ts
parseMarkdown(md, {
  // Highlight fenced code. `info` is the full info string ("ts :line-numbers").
  // Return inner HTML for <code>, or a full DomphyElement to wrap the block.
  highlight: (code, info) => `<span class="tok">${code}</span>`,

  // Custom heading slug function (used for anchors and the toc).
  anchorSlugify: (text) => text.toLowerCase().replace(/\s+/g, "-"),

  // Additional remark/unified plugins.
  plugins: [remarkGfmFootnotes],

  // Handle mdast node types the core walker doesn't recognise (e.g. directives).
  // The `helper` arg provides a `walkChildren` helper for recursive conversion.
  onCustom: (node, helper) => {
    if (node.type === "math") return { div: node.value, class: "math math-display" }
    return null
  },
})
```

## Plugin API — `createMarkdown`

For reusable parsers with a shared remark processor (e.g. `@domphy/press`):

```ts
import { createMarkdown } from "@domphy/markdown"
import remarkMath from "remark-math"

const md = createMarkdown({
  highlight: (code, info) => `<code>${code}</code>`,
  plugins: [remarkMath],
  math: true,   // shorthand: auto-adds remark-math (must install it: pnpm add remark-math)
})

const { frontmatter, body, toc } = md.parse("# Hello\n\nText.")
const elements = md.toDomphy("# Hello")  // body only
```

`math: true` preserves raw LaTeX (`$...$`, `$$...$$`) as plain text for client-side KaTeX/MathJax auto-rendering. It does NOT render math server-side.

## API

| Export | Description |
|---|---|
| `parseMarkdown(md, options?)` | Parse markdown string → `{ frontmatter, body, toc }` |
| `markdownToDomphy(md, options?)` | Parse markdown string → `DomphyElement[]` (body only) |
| `createMarkdown(options?)` | Create a reusable `MarkdownInstance` (`{ parse, toDomphy }`) sharing a single remark processor |
| `splitFrontmatter(md)` | Split YAML frontmatter → `{ frontmatter: Record<string, unknown>, content: string }` |
| `walkMdast(root, options?)` | Walk an mdast Root node → `DomphyElement[]` (low-level, used internally) |
| `createUniqueSlugger(slugify?)` | Create a slugger that guarantees unique anchor IDs across a document |
| `defaultSlugify` | Default slug function: lowercase + replace whitespace with `-` |

## License

MIT
