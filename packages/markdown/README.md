# @domphy/markdown

Parse Markdown into [Domphy](https://domphy.com) element trees so it can be server-rendered by `@domphy/core` / `@domphy/app`.

It walks [markdown-it](https://github.com/markdown-it/markdown-it)'s token stream and builds plain Domphy element objects (`{ h1: ... }`, `{ ul: [...] }`, `{ pre: [{ code: ... }] }`, ...) — semantic tags only, no inline typography styles. Styling stays the consumer's job via patches and theme.

Features:

- Headings with slug `id` for anchors, plus a collected table of contents
- Paragraphs, bold / italic / strikethrough, inline code
- Fenced code blocks (language preserved as `data-language` and `class="language-..."`, with a pluggable highlighter)
- Links, images, blockquotes, ordered / unordered / nested lists (`_key` on list items)
- GFM tables, horizontal rules, raw inline / block HTML pass-through
- YAML frontmatter splitting
- `markdown-it-anchor` wired for heading anchors

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
  // Highlight fenced code. Return inner HTML for <code>, or a DomphyElement.
  highlight: (code, language) => `<span class="tok">${code}</span>`,

  // Custom heading slug function (used for anchors and the toc).
  anchorSlugify: (text) => text.toLowerCase().replace(/\s+/g, "-"),

  // Forwarded to the markdown-it constructor.
  mdOptions: { breaks: true },
})
```

## API

- `parseMarkdown(md, options?) => { frontmatter, body, toc }`
- `markdownToDomphy(md, options?) => DomphyElement[]`

## License

MIT
