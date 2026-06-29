---
title: "Frontmatter"
description: "Parse YAML frontmatter from markdown documents with @domphy/markdown."
---

# Frontmatter

A markdown file can begin with a YAML block called **frontmatter** — metadata such as a page title, description, publication date, or any custom fields your app needs. `@domphy/markdown` strips the block before markdown parsing and returns the parsed values alongside the document body.

## Format

A frontmatter block is delimited by `---` lines and must appear at the **very start** of the file:

```yaml
---
title: Getting Started
description: A quick tour of the API.
author: Jane
tags:
  - tutorial
  - intro
published: 2024-01-15
---

# Getting Started

The actual document begins here.
```

The closing delimiter may also be `...` (the YAML document-end marker). Leading or trailing whitespace on the closing line is ignored. Everything after the closing `---` or `...` line is the document body.

::: tip
A leading `---` with no matching closing fence is treated as a thematic break, not frontmatter. The `---` remains in the content and the markdown parser emits an `<hr>` for it.
:::

## splitFrontmatter

`splitFrontmatter(markdown)` is the lowest-level helper. It splits the YAML block from the rest of the content without doing any markdown parsing:

```ts
import { splitFrontmatter } from "@domphy/markdown"

const source = `---
title: My Page
draft: true
tags:
  - alpha
  - beta
---

# Body starts here
`

const { frontmatter, content } = splitFrontmatter(source)

frontmatter  // { title: "My Page", draft: true, tags: ["alpha", "beta"] }
content      // "\n# Body starts here\n"
```

| Field | Type | Description |
| --- | --- | --- |
| `frontmatter` | `Record<string, unknown>` | Parsed YAML key-value pairs, or `{}` when the block is absent or unparseable. |
| `content` | `string` | The markdown text with the frontmatter block removed. |

`splitFrontmatter` **never throws**. If the YAML inside the block is malformed, the block is still stripped from `content` and `frontmatter` returns as `{}`. This ensures a broken header never crashes a build.

## parseMarkdown returns frontmatter too

`parseMarkdown` calls `splitFrontmatter` internally. When using `parseMarkdown` you do not need to call `splitFrontmatter` yourself:

```ts
import { parseMarkdown } from "@domphy/markdown"

const { frontmatter, body, toc } = parseMarkdown(`---
title: My Page
description: Page description here.
tags:
  - guides
---

# My Page

Content.
`)

frontmatter.title        // "My Page"
frontmatter.description  // "Page description here."
frontmatter.tags         // ["guides"]
```

The `body` array contains the parsed document and `toc` collects the heading entries — neither includes any frontmatter content.

## Type-safe access

`frontmatter` is typed as `Record<string, unknown>`. Narrow the values before use. A lightweight approach with `typeof` guards:

```ts
const { frontmatter } = parseMarkdown(source)

const title   = typeof frontmatter.title   === "string"  ? frontmatter.title   : "Untitled"
const draft   = typeof frontmatter.draft   === "boolean" ? frontmatter.draft   : false
const tags    = Array.isArray(frontmatter.tags)          ? frontmatter.tags as string[] : []
```

For projects with many content fields, a schema validator like [Zod](https://zod.dev) keeps the contract explicit:

```ts
import { z } from "zod"
import { parseMarkdown } from "@domphy/markdown"

const PageSchema = z.object({
  title:       z.string(),
  description: z.string().optional(),
  published:   z.coerce.date().optional(),
  draft:       z.boolean().default(false),
  tags:        z.array(z.string()).default([]),
})

function loadPage(source: string) {
  const { frontmatter, body, toc } = parseMarkdown(source)
  const meta = PageSchema.parse(frontmatter)
  return { meta, body, toc }
}
```

## Building a page index

A common pattern for documentation sites: parse all source files up front, extract metadata into a page index, then render on demand.

```ts
import { ElementNode } from "@domphy/core"
import { parseMarkdown } from "@domphy/markdown"

// Assume these are loaded from the file system at build time.
const sources: Record<string, string> = {
  "intro.md":  introSource,
  "guide.md":  guideSource,
}

const pages = Object.entries(sources).map(([file, source]) => {
  const { frontmatter, body, toc } = parseMarkdown(source)
  return {
    slug:        file.replace(/\.md$/, ""),
    title:       String(frontmatter.title ?? ""),
    description: String(frontmatter.description ?? ""),
    draft:       frontmatter.draft === true,
    body,
    toc,
  }
})

const published = pages.filter((page) => !page.draft)

function renderPage(slug: string): string {
  const page = published.find((p) => p.slug === slug)
  if (!page) return new ElementNode({ p: "Not found" }).generateHTML()
  return new ElementNode({ article: page.body }).generateHTML()
}
```

## Using splitFrontmatter in a custom pipeline

When you build your own remark pipeline (via `walkMdast`), call `splitFrontmatter` first to extract the frontmatter before passing the content to remark:

```ts
import { remark } from "remark"
import remarkGfm from "remark-gfm"
import { splitFrontmatter, walkMdast, createUniqueSlugger, defaultSlugify } from "@domphy/markdown"

const processor = remark().use(remarkGfm)

function parse(source: string) {
  const { frontmatter, content } = splitFrontmatter(source)
  const tree = processor.parse(content)
  processor.runSync(tree, content)
  const toc: TocEntry[] = []
  const body = walkMdast(tree, { slug: createUniqueSlugger(defaultSlugify), toc })
  return { frontmatter, body, toc }
}
```

## Supported YAML types

All standard YAML scalar types work:

```yaml
---
title:    "Hello World"           # string
version:  3                       # number
draft:    false                   # boolean
date:     2024-06-01              # Date (parsed as JS Date object)
tags:
  - alpha
  - beta                          # array of strings
author:
  name:   Jane Doe                # nested object
  email:  jane@example.com
---
```

Frontmatter must be a **YAML mapping** (key-value pairs) at the top level. A top-level list or scalar is parsed by the YAML library but silently discarded — `frontmatter` returns `{}` in that case.

## FrontmatterSplit type

The return type of `splitFrontmatter` is exported:

```ts
import type { FrontmatterSplit } from "@domphy/markdown"

function stripHeaders(files: string[]): FrontmatterSplit[] {
  return files.map((source) => splitFrontmatter(source))
}
```
