---
title: "Syntax Highlighting"
description: "Use the highlight option to add syntax highlighting to fenced code blocks in @domphy/markdown."
---

# Syntax Highlighting

The `highlight` option in `parseMarkdown` and `markdownToDomphy` lets you plug any syntax highlighter into fenced code block rendering. The highlighter receives the raw code and language identifier per block, and can return either a **string of HTML** or a **Domphy element**.

## The Highlight type

```ts
type Highlight = (
  code:     string,
  language: string,
) => string | DomphyElement | null | undefined
```

| Parameter | Description |
| --- | --- |
| `code` | Raw source text of the block. Not HTML-escaped — that is the highlighter's job. |
| `language` | Language identifier from the fence (e.g. `"ts"`, `"css"`, `"sh"`). Empty string when no language is given. |

| Return value | What happens |
| --- | --- |
| Non-empty string | Used as the **inner HTML** of the `<code>` element. Markup is preserved verbatim. |
| `DomphyElement` | Used as the **sole child** of the `<code>` element. Stays in the element tree. |
| Falsy (`null`, `undefined`, empty string) | Falls back to plain escaped text. |

## String return — inner HTML

Most highlighters emit HTML strings. Return the string and `@domphy/markdown` sets it as the inner HTML of the `<code>` element:

```ts
import { parseMarkdown } from "@domphy/markdown"

const { body } = parseMarkdown("```ts\nconst x = 1\n```", {
  highlight(code, language) {
    return `<span class="hl-${language}">${code}</span>`
  },
})

// body[0] ->
// { pre: [{ code: '<span class="hl-ts">const x = 1\n</span>', dataLanguage: "ts", class: "language-ts" }] }
```

The `dataLanguage` and `class` properties on the `<code>` element are always emitted by the walker when a language identifier is present, regardless of whether a highlighter is supplied.

## DomphyElement return — stay in the element tree

Return a `DomphyElement` when you want the highlighted output to remain as a Domphy tree node rather than a raw HTML string:

```ts
import type { DomphyElement } from "@domphy/core"
import { parseMarkdown } from "@domphy/markdown"

const { body } = parseMarkdown("```js\nfoo()\n```", {
  highlight(code): DomphyElement {
    return { span: code, class: "code-block" }
  },
})

// body[0] ->
// {
//   pre: [{
//     code: [{ span: "foo()\n", class: "code-block" }],
//     dataLanguage: "js",
//     class: "language-js",
//   }]
// }
```

## Falling back for unknown languages

Return `null` or `undefined` to skip highlighting for a specific block. The walker falls back to plain escaped text:

```ts
import { parseMarkdown } from "@domphy/markdown"

const knownLanguages = new Set(["ts", "js", "css", "html", "sh"])

const { body } = parseMarkdown(source, {
  highlight(code, language) {
    if (!language || !knownLanguages.has(language)) return null
    return myHighlighter(code, language)
  },
})
```

## Integrating Shiki

[Shiki](https://shiki.style) emits HTML strings — a natural fit for the string-return path. Create the highlighter once outside the parse call to avoid re-initialising it per document:

```ts
import { createHighlighter } from "shiki"
import { parseMarkdown } from "@domphy/markdown"

// Initialise once at app startup or build time.
const shiki = await createHighlighter({
  themes: ["github-light"],
  langs:  ["ts", "js", "css", "html", "sh"],
})

function renderDoc(source: string) {
  return parseMarkdown(source, {
    highlight(code, language) {
      if (!language) return null
      try {
        // codeToHtml wraps its output in <pre><code>. Extract only the
        // inner content so we don't double-wrap with the walker's own <pre>.
        const full = shiki.codeToHtml(code, { lang: language, theme: "github-light" })
        // Shiki's output: <pre ...><code ...>...tokens...</code></pre>
        // We want only what's inside <code>...</code>.
        const match = full.match(/<code[^>]*>([\s\S]*)<\/code>/)
        return match ? match[1] : null
      } catch {
        return null // unknown language: fall back to plain text
      }
    },
  })
}
```

## Integrating highlight.js

highlight.js emits annotated HTML strings directly without the outer wrapper:

```ts
import hljs from "highlight.js"
import { parseMarkdown } from "@domphy/markdown"

const { body } = parseMarkdown(source, {
  highlight(code, language) {
    if (!language) return null
    const registered = hljs.getLanguage(language)
    if (!registered) return null
    return hljs.highlight(code, { language }).value
  },
})
```

Then include the corresponding highlight.js CSS theme on the page. The `<code>` element already carries `class="language-{lang}"` from the walker, which most themes target.

## Building a custom token-based highlighter

Return a `DomphyElement` when you want full control over the output structure without raw HTML strings:

```ts
import type { DomphyElement } from "@domphy/core"
import { parseMarkdown } from "@domphy/markdown"

// A tiny highlighter that wraps comment lines in a distinct span.
function commentHighlight(code: string, language: string): DomphyElement {
  const parts: (string | DomphyElement)[] = []
  const lines = code.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trimStart().startsWith("//")) {
      parts.push({ span: line, class: "code-comment" })
    } else {
      parts.push(line)
    }
    // Add a newline between lines, but not after the last one.
    if (i < lines.length - 1) parts.push("\n")
  }

  return { span: parts, class: `language-${language}` }
}

const { body } = parseMarkdown("```ts\n// setup\nconst x = 1\n```", {
  highlight(code, language) {
    if (language !== "ts" && language !== "js") return null
    return commentHighlight(code, language)
  },
})
```

## CSS-only highlighting without a highlighter option

Skip the `highlight` option entirely to let a client-side CSS library handle colouring. The walker already emits the right attributes:

```html
<!-- rendered output for a fenced ts block -->
<pre>
  <code class="language-ts" data-language="ts">const x = 1;</code>
</pre>
```

Load a CSS theme on the page and the `language-*` class provides the hook:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>hljs.highlightAll()</script>
```

## Using highlight with tokensToDomphy

The `highlight` option is also accepted by `tokensToDomphy` when you supply your own markdown-it instance:

```ts
import MarkdownIt from "markdown-it"
import { splitFrontmatter, tokensToDomphy } from "@domphy/markdown"

const md = new MarkdownIt({ html: true })

const { content } = splitFrontmatter(source)
const tokens = md.parse(content, {})

const { body } = tokensToDomphy(tokens, {
  highlight(code, language) {
    return myHighlighter(code, language)
  },
})
```
