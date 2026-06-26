---
title: "Table of Contents"
description: "Use the toc array from parseMarkdown to build navigation in @domphy/markdown."
---

# Table of Contents

`parseMarkdown` collects every heading in the document into a flat `toc` array alongside the body. Use it to build a sidebar, in-page navigation, or a chapter index without scanning the rendered HTML output.

## TocEntry shape

Each entry is a `TocEntry`:

```ts
interface TocEntry {
  level: number  // heading depth: 1 for h1, 2 for h2, ..., 6 for h6
  text:  string  // plain-text heading content (markup stripped)
  slug:  string  // the heading's id attribute value
}
```

For a document that starts:

```markdown
# Getting Started

## Installation

### Prerequisites

## Configuration
```

The `toc` array is:

```ts
[
  { level: 1, text: "Getting Started",  slug: "getting-started" },
  { level: 2, text: "Installation",     slug: "installation" },
  { level: 3, text: "Prerequisites",    slug: "prerequisites" },
  { level: 2, text: "Configuration",    slug: "configuration" },
]
```

The `slug` field is the same value as the `id` attribute on the corresponding heading element in `body`:

```ts
// body[0]
{ h1: ["Getting Started"], id: "getting-started" }
```

So `toc[i].slug` can always be used as an `href` anchor target for `body[i]`.

## TocEntry type

`TocEntry` is exported from the package:

```ts
import type { TocEntry } from "@domphy/markdown"
```

## Rendering a flat anchor list

Emit a simple `nav > a` list from the toc array:

```ts
import { ElementNode } from "@domphy/core"
import { parseMarkdown } from "@domphy/markdown"

const { body, toc } = parseMarkdown(source)

const tocNav = {
  nav: toc.map((entry) => ({
    a:    entry.text,
    href: `#${entry.slug}`,
  })),
}

const page = new ElementNode({
  div: [tocNav, { article: body }],
})
const html = page.generateHTML()
```

## Filtering by heading level

Show a summary with only top-level headings, or restrict to a specific range:

```ts
const { toc } = parseMarkdown(source)

// Only h1 and h2.
const topToc = toc.filter((entry) => entry.level <= 2)

// Only the chapter titles (h1).
const chapters = toc.filter((entry) => entry.level === 1)
```

## Building a nested TOC tree

Convert the flat array into a parent-children hierarchy for an indented sidebar:

```ts
import type { TocEntry } from "@domphy/markdown"
import type { DomphyElement } from "@domphy/core"

interface TocNode {
  entry:    TocEntry
  children: TocNode[]
}

function buildTocTree(entries: TocEntry[]): TocNode[] {
  const root: TocNode[] = []
  const stack: TocNode[] = []

  for (const entry of entries) {
    const node: TocNode = { entry, children: [] }

    // Pop nodes from the stack until we find one shallower than this entry.
    while (stack.length > 0 && stack[stack.length - 1].entry.level >= entry.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }

  return root
}

function renderTocTree(nodes: TocNode[]): DomphyElement {
  return {
    ul: nodes.map((node) => ({
      li: [
        { a: node.entry.text, href: `#${node.entry.slug}` },
        ...(node.children.length > 0 ? [renderTocTree(node.children)] : []),
      ],
      _key: node.entry.slug,
    })),
  }
}
```

Usage:

```ts
import { ElementNode } from "@domphy/core"
import { parseMarkdown } from "@domphy/markdown"

const { body, toc } = parseMarkdown(source)
const tree = buildTocTree(toc)
const tocElement = renderTocTree(tree)

const page = new ElementNode({
  div: [
    { aside: [tocElement] },
    { article: body },
  ],
})
const html = page.generateHTML()
```

## Active-heading tracking with reactivity

Track which heading is currently in the viewport and highlight the corresponding TOC item using Domphy reactive state:

```ts
import { toState } from "@domphy/core"
import { parseMarkdown } from "@domphy/markdown"

const { body, toc } = parseMarkdown(source)

// Reactive state for the currently active heading slug.
const activeSlug = toState<string | null>(null)

function updateActive(): void {
  const scrollY = window.scrollY + 80 // offset for a sticky header
  let current: string | null = null

  for (const entry of toc) {
    const el = document.getElementById(entry.slug)
    if (el && el.offsetTop <= scrollY) current = entry.slug
  }
  activeSlug.set(current)
}

window.addEventListener("scroll", updateActive, { passive: true })
updateActive()

// Render TOC items. The class listener re-evaluates whenever activeSlug changes.
const tocItems = {
  nav: toc.map((entry) => ({
    a:     entry.text,
    href:  `#${entry.slug}`,
    class: (l: any) => activeSlug.get(l) === entry.slug ? "toc-active" : "",
  })),
}
```

## Generating a JSON page manifest

The toc array serialises cleanly to JSON — useful for search indexes or pre-rendered navigation:

```ts
import { parseMarkdown } from "@domphy/markdown"

const pages = sources.map((source) => {
  const { frontmatter, toc } = parseMarkdown(source)
  return {
    title:    String(frontmatter.title ?? ""),
    headings: toc.map((entry) => ({ text: entry.text, slug: entry.slug, level: entry.level })),
  }
})

// Write or cache pages as JSON for a search index.
const manifest = JSON.stringify(pages, null, 2)
```

## toc with tokensToDomphy

The toc array is returned by `tokensToDomphy` as well when you supply your own markdown-it instance:

```ts
import MarkdownIt from "markdown-it"
import { splitFrontmatter, tokensToDomphy } from "@domphy/markdown"

const md = new MarkdownIt({ html: true })

const { content } = splitFrontmatter(source)
const tokens = md.parse(content, {})
const { body, toc } = tokensToDomphy(tokens)

// toc is populated the same way as with parseMarkdown.
console.log(toc.map((entry) => `${entry.level}: ${entry.text} -> #${entry.slug}`))
```
