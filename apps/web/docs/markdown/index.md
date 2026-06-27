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
- GFM tables, GFM task lists (`- [x]` / `- [ ]`), horizontal rules, raw inline / block HTML pass-through
- YAML frontmatter splitting
- LaTeX math (`$...$` inline, `$$...$$` display) via optional built-in plugin
- `markdown-it-anchor` wired for heading anchors
- Plugin API via `createMarkdown({ plugins: [...] })` for custom markdown-it extensions

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

## createMarkdown — plugin API

`createMarkdown(options?)` builds a reusable parser from a pre-configured markdown-it instance. Use it when you need:

- Custom **plugins** for markdown-it
- Built-in **math** support (`$...$` / `$$...$$`)
- GFM **task lists** (`- [x]` / `- [ ]`)

The returned object exposes `.parse(md)` (same shape as `ParseResult`) and `.toDomphy(md)` (body array only).

```ts
import { createMarkdown } from "@domphy/markdown"

const parser = createMarkdown({
  math: true,
  tasklists: true,
  highlight: (code, lang) => myHighlighter(code, lang),
})

const { frontmatter, body, toc } = parser.parse(source)
// or
const body = parser.toDomphy(source)
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `plugins` | `MarkdownPlugin[]` | `[]` | Array of `(md) => void` functions applied to the internal markdown-it instance. |
| `math` | `boolean` | `false` | Enable built-in LaTeX math support (`$...$` and `$$...$$`). |
| `tasklists` | `boolean` | `false` | Enable GFM task list items (`- [x]` / `- [ ]`). |
| `highlight` | `Highlight` | — | Same as `parseMarkdown` highlight option. |
| `anchorSlugify` | `AnchorSlugify` | — | Same as `parseMarkdown` anchorSlugify option. |
| `mdOptions` | `markdown-it` options | — | Same as `parseMarkdown` mdOptions option. |

### Custom plugins

Each entry in `plugins` receives the markdown-it instance and can call `md.use(...)`, `md.block.ruler.before(...)`, etc.:

```ts
import container from "markdown-it-container"
import { createMarkdown } from "@domphy/markdown"

const parser = createMarkdown({
  plugins: [
    (md) => md.use(container, "tip"),
    (md) => md.use(container, "warning"),
  ],
})
```

User-supplied plugins run last — after `math` and `tasklists` — so they can extend or override built-in behavior.

### Math support

When `math: true`, the built-in math plugin adds:

- **Inline math** `$E = mc^2$` → `{ span: "E = mc^2", class: "math math-inline" }`
- **Display math** (block):
  ````
  $$
  \int_0^\infty e^{-x}\,dx = 1
  $$
  ````
  → `{ div: "\\int_0^\\infty e^{-x}\\,dx = 1\n", class: "math math-display" }`

The raw LaTeX is preserved in the element content. To render it, load KaTeX's auto-render extension from CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"></script>
<script defer
  src="https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body)"></script>
```

KaTeX's `auto-render` finds all `.math` elements and renders them in-place. No bundled KaTeX dependency is required.

### Task lists

When `tasklists: true`, list items beginning with `[ ]` or `[x]` get a disabled checkbox element prepended:

```markdown
- [x] Deploy release
- [x] Write release notes
- [ ] Announce on forum
```

```ts
// body[0] (the ul)
{
  ul: [
    {
      li: [{ input: null, type: "checkbox", disabled: true, checked: true }, "Deploy release"],
      _key: 0,
    },
    {
      li: [{ input: null, type: "checkbox", disabled: true, checked: true }, "Write release notes"],
      _key: 1,
    },
    {
      li: [{ input: null, type: "checkbox", disabled: true }, "Announce on forum"],
      _key: 2,
    },
  ],
}
```

The checkboxes are `disabled` — task lists in markdown are visual, not interactive form controls.

## Custom pipelines

For a documentation generator that needs **extra** markdown-it plugins — containers (`::: tip`), file includes, custom inline rules — you have two options:

**Option A:** Use `createMarkdown({ plugins })` — simpler, recommended for most cases:

```ts
import container from "markdown-it-container"
import { createMarkdown } from "@domphy/markdown"

const parser = createMarkdown({
  plugins: [(md) => md.use(container, "tip")],
})
const { body } = parser.parse("::: tip\nUse the plugin API.\n:::")
```

**Option B:** Run your own markdown-it instance and feed tokens to the walker — maximum control, needed when `@domphy/press` integrates at a lower level:

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
| `createMarkdown(options?)` | Create a reusable parser with plugins, math, and task list support. |
| `tokensToDomphy(tokens, options?)` | Convert a pre-parsed markdown-it token stream into `{ body, toc }`. Use with your own markdown-it instance. |
| `walkTokens(tokens, context)` | The raw walker `tokensToDomphy` is built on, for the most control. |
| `splitFrontmatter(md)` | Split a document into `{ frontmatter, content }` before parsing. |
| `createUniqueSlugger(slugify)` | A stateful slugger that de-duplicates repeated heading slugs. |
| `defaultSlugify(text)` | The built-in slug function. |
| `mathPlugin` | The built-in math markdown-it plugin (can be applied to your own instance). |
| `taskListPlugin` | The built-in task list markdown-it plugin (can be applied to your own instance). |

This is exactly how DomphyPress (this site) works: its markdown-it instance adds containers and includes, then hands the tokens to `tokensToDomphy`.
