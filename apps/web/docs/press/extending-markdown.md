---
title: "Extending Markdown"
description: "Add custom remark/rehype plugins, custom code block renderers, and Domphy component embeds."
---

# Extending Markdown

## Remark and rehype plugins

`@domphy/press` processes Markdown through `remark` and `rehype`. Add plugins in `press.config.ts`:

```ts
// press.config.ts
import { defineConfig } from "@domphy/press"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeAutolinkHeadings from "rehype-autolink-headings"

export default defineConfig({
  markdown: {
    remarkPlugins: [
      remarkGfm,
      remarkMath,
    ],
    rehypePlugins: [
      rehypeKatex,
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
    ],
  },
})
```

## Math rendering

With `remark-math` + `rehype-katex`, inline and block math works out of the box:

```markdown
Inline math: $E = mc^2$

Block math:
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

Add the KaTeX CSS to your HTML:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">
```

## Custom code block renderer

Replace the default code block with a custom component — e.g., add a copy button:

```ts
// press.config.ts
import { defineConfig } from "@domphy/press"
import { CodeBlock } from "./src/CodeBlock"

export default defineConfig({
  markdown: {
    components: {
      // Replace <pre><code> with custom component
      pre: CodeBlock,
    },
  },
})
```

```ts
// src/CodeBlock.ts
import { button, tooltip } from "@domphy/ui"
import { toState } from "@domphy/core"

export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const copied = toState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    copied.set(true)
    setTimeout(() => copied.set(false), 2000)
  }

  return {
    div: [
      {
        pre: { code },
        class: `language-${lang}`,
      },
      {
        button: (l) => copied.get(l) ? "✓ Copied" : "Copy",
        onClick: copy,
        $: [button({ variant: "ghost" }), tooltip({ content: "Copy code" })],
        style: { position: "absolute", top: "8px", right: "8px" },
      },
    ],
    style: { position: "relative" },
  }
}
```

## Custom directive syntax

Install `remark-directive` to add custom block/inline directives:

```ts
// press.config.ts
import remarkDirective from "remark-directive"
import { remarkDomphyDirectives } from "./src/directives"

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkDirective, remarkDomphyDirectives],
  },
})
```

```markdown
:::tip
This is a tip callout.
:::

:::warning
Watch out for this edge case.
:::

::badge[New]{type="success"}
```

Implement the directive handler:

```ts
// src/directives.ts
import type { Plugin } from "unified"
import { visit } from "unist-util-visit"

export const remarkDomphyDirectives: Plugin = () => (tree) => {
  visit(tree, (node: any) => {
    if (node.type === "containerDirective") {
      const type = node.name  // "tip", "warning", "danger", "info"
      node.type = "html"
      node.value = `<div class="callout callout-${type}">${nodeToHtml(node)}</div>`
    }
  })
}
```

## Frontmatter

Every Markdown file can have YAML frontmatter — access it in layouts:

```markdown
---
title: "My Page"
description: "A short description."
date: 2024-01-15
tags: [guide, advanced]
---

# Content starts here
```

Access in custom layout:

```ts
// press.config.ts
export default defineConfig({
  theme: {
    layout: ({ frontmatter, content }) => ({
      article: [
        {
          header: [
            { h1: frontmatter.title },
            { p: frontmatter.description },
          ],
        },
        { div: content },
        frontmatter.tags?.length
          ? { div: frontmatter.tags.map((tag: string) => ({ span: tag, class: "tag" })) }
          : null,
      ].filter(Boolean),
    }),
  },
})
```

## Syntax highlighting themes

Switch the Shiki syntax highlighting theme:

```ts
export default defineConfig({
  markdown: {
    highlight: {
      theme: {
        light: "github-light",
        dark: "github-dark",
      },
      // Or a single theme:
      // theme: "nord"
    },
  },
})
```

Available themes: `github-light`, `github-dark`, `monokai`, `one-dark-pro`, `dracula`, `solarized-light`, `material-theme`, `catppuccin-latte`, etc. Full list at the Shiki docs.
