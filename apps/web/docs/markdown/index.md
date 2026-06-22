# Markdown

`@domphy/markdown` parses Markdown into **Domphy element trees** — plain objects like `{ h1: ... }`, `{ ul: [...] }`, `{ pre: [{ code: ... }] }` — so the result can be server-rendered by `@domphy/core` / `@domphy/app` with no client runtime.

It walks [markdown-it](https://github.com/markdown-it/markdown-it)'s token stream and emits **semantic tags only** — no inline typography styles. Styling stays the consumer's job, applied through patches and theme, exactly like hand-written Domphy.

::: tip
This very site is built on `@domphy/markdown`. The DomphyPress engine feeds its own markdown-it token stream (with containers, includes and code imports) into the package's canonical walker, then renders the resulting Domphy tree to static HTML.
:::

## What you get

- Headings with a slug `id` for anchors, plus a collected table of contents
- Paragraphs, bold / italic / strikethrough, inline code
- Fenced code blocks (language preserved as `class="language-..."` and `data-language`, with a pluggable highlighter)
- Links, images, blockquotes, ordered / unordered / nested lists (`_key` on list items)
- GFM tables, horizontal rules, raw inline / block HTML pass-through
- YAML frontmatter splitting
- `markdown-it-anchor` wired for heading anchors

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

```ts
parseMarkdown(md, {
  // Highlight fenced code. Return inner HTML for the <code>, or a DomphyElement.
  // A falsy return falls back to plain escaped text.
  highlight: (code, language) => `<span class="tok">${code}</span>`,

  // Custom heading slug function (used for anchors and the toc).
  anchorSlugify: (text) => text.toLowerCase().replace(/\s+/g, "-"),

  // Forwarded to the markdown-it constructor.
  mdOptions: { breaks: true },
})
```

| Option | Type | Description |
| --- | --- | --- |
| `highlight` | `(code, language) => string \| DomphyElement \| null \| undefined` | Highlighter for fenced code blocks. A returned string is used as the `<code>` inner HTML; a `DomphyElement` becomes its single child. |
| `anchorSlugify` | `(text) => string` | Slug function for heading `id`s and toc entries. |
| `mdOptions` | `markdown-it` options | Merged into the markdown-it constructor (e.g. `{ breaks: true }`). |

## Custom pipelines

For a documentation generator that needs **extra** markdown-it plugins — containers (`::: tip`), file includes, custom inline rules — run your own markdown-it instance and feed its token stream to the package's canonical walker. You get the same `body` / `toc` without reimplementing the token-to-Domphy conversion.

```ts
import MarkdownIt from "markdown-it"
import container from "markdown-it-container"
import { splitFrontmatter, tokensToDomphy } from "@domphy/markdown"

const md = new MarkdownIt({ html: true, linkify: true })
md.use(container, "tip")

const source = "::: tip\nUse the walker directly.\n:::"
const { frontmatter, content } = splitFrontmatter(source)
const tokens = md.parse(content, {})

const { body, toc } = tokensToDomphy(tokens, {
  // Same highlight / anchorSlugify options as parseMarkdown.
  highlight: (code) => code,
})
```

The lower-level building blocks are all exported:

| Export | Description |
| --- | --- |
| `tokensToDomphy(tokens, options?)` | Convert a pre-parsed markdown-it token stream into `{ body, toc }`. Use with your own markdown-it instance. |
| `walkTokens(tokens, context)` | The raw walker `tokensToDomphy` is built on, for the most control. |
| `splitFrontmatter(md)` | Split a document into `{ frontmatter, content }` before parsing. |
| `createUniqueSlugger(slugify)` | A stateful slugger that de-duplicates repeated heading slugs. |
| `defaultSlugify(text)` | The built-in slug function. |

This is exactly how DomphyPress (this site) works: its markdown-it instance adds containers and includes, then hands the tokens to `tokensToDomphy`.
