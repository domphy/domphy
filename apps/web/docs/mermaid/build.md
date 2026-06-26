---
title: "Build-Time Integration"
description: "Integrate @domphy/mermaid into SSG and Vite build pipelines — cache management, markdown tree rendering, custom renderers, and CI configuration."
---

# Build-Time Integration

The build-time path renders each diagram to inline SVG during your build using a headless browser (via `@mermaid-js/mermaid-cli`). The browser ships no Mermaid runtime — diagrams are plain SVG in your HTML.

## How it works

Three functions cover the build-time path:

| Function | Purpose |
|----------|---------|
| `renderMermaidToSvg(code, options?)` | Render one diagram, no caching |
| `renderMermaidCached(code, options?)` | Render with on-disk cache |
| `renderMermaidInTree(elements, options?)` | Render all Mermaid blocks in a `@domphy/markdown` tree |

`@mermaid-js/mermaid-cli` is a direct dependency — it manages Puppeteer (Chrome headless) internally. You do not install or configure Puppeteer yourself.

## Rendering a single diagram

```ts
import { renderMermaidToSvg } from "@domphy/mermaid"

const svg = await renderMermaidToSvg(`flowchart LR
  A --> B --> C`, {
  theme: "neutral",
  background: "transparent",
})
// svg === "<svg xmlns=...>...</svg>"
```

Syntax errors throw an `Error` that includes the diagram source — they are never silently swallowed:

```
@domphy/mermaid: failed to render diagram.
Parse error on line 1: ...
--- source ---
flowchart LR; INVALID NODE
```

## Source normalization

`renderMermaidToSvg` (and all other render functions) call `normalizeMermaidSource` before rendering. You can call it directly to strip leading/trailing whitespace and normalize line endings before storing or comparing sources:

```ts
import { normalizeMermaidSource } from "@domphy/mermaid"

const source = normalizeMermaidSource(`
  flowchart LR
    A --> B  
`)
// "flowchart LR\n  A --> B"
```

This normalization is also applied inside `cacheKey`, so cache lookups are consistent regardless of incidental whitespace differences.

## On-disk cache

Use `renderMermaidCached` in build scripts to avoid re-rendering diagrams that have not changed between builds:

```ts
import { renderMermaidCached, DEFAULT_CACHE_DIR } from "@domphy/mermaid"

const svg = await renderMermaidCached(source, {
  theme: "neutral",
  cacheDir: DEFAULT_CACHE_DIR, // node_modules/.cache/domphy-mermaid
})
```

The cache key is a stable SHA-256 hash of the normalized source plus the output-affecting options (`theme`, `background`, `mermaidConfig`, `css`). Options that do not affect the output (`cacheDir`, `cache`, `puppeteer`) are excluded from the hash, so changing them does not invalidate cached SVGs.

Bypassing the cache for a fresh render:

```ts
const svg = await renderMermaidCached(source, { cache: false })
```

Changing the cache directory (e.g. in a monorepo with a shared cache):

```ts
const svg = await renderMermaidCached(source, {
  cacheDir: "../../.cache/mermaid",
})
```

### Computing cache keys manually

The `cacheKey` function lets you check whether a diagram is already cached before invoking the renderer:

```ts
import { cacheKey, DEFAULT_CACHE_DIR } from "@domphy/mermaid"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const key = cacheKey(source, { theme: "dark" })
const cachePath = join(DEFAULT_CACHE_DIR, `${key}.svg`)

try {
  const cached = await readFile(cachePath, "utf8")
  console.log("Cache hit:", key)
} catch {
  console.log("Cache miss — will render")
}
```

## Markdown tree integration

When using `@domphy/markdown` to parse Markdown content, `renderMermaidInTree` walks the resulting element tree, finds every fenced ` ```mermaid ` block, renders each to SVG, and replaces the code block node with an SVG-wrapping element:

**Input** (what `@domphy/markdown` emits for a ` ```mermaid ` fence):
```js
{ pre: [{ code: "<escaped source>", dataLanguage: "mermaid", class: "language-mermaid" }] }
```

**Output** (what `renderMermaidInTree` replaces it with):
```js
{ div: "<svg ...>...</svg>", class: "mermaid", ariaLabel: "diagram" }
```

```ts
import { parseMarkdown } from "@domphy/markdown"
import { renderMermaidInTree } from "@domphy/mermaid"

const markdown = `
# Architecture

\`\`\`mermaid
flowchart LR
  Browser --> CDN --> Origin
\`\`\`

The CDN sits in front of every request.
`

const { body } = parseMarkdown(markdown)
const rendered = await renderMermaidInTree(body, { theme: "neutral" })

// rendered is a DomphyElement[] — the mermaid block is now a div with inline SVG.
// All other nodes (h1, p, other code blocks) are unchanged.
```

Identical diagram sources across a document are rendered only once. All distinct diagrams render concurrently with `Promise.all`.

### Options for `renderMermaidInTree`

`TreeOptions` extends `CacheOptions` with two additional fields:

| Option | Type | Default |
|--------|------|---------|
| `renderer` | `(code, options?) => Promise<string>` | `renderMermaidCached` |
| `className` | `string` | `"mermaid"` |
| `ariaLabel` | `string` | `"diagram"` |

Customize the wrapper element class and accessibility label:

```ts
const rendered = await renderMermaidInTree(body, {
  theme: "dark",
  className: "diagram-block",
  ariaLabel: "architecture diagram",
})
```

## Custom renderer for testing

Inject a custom `renderer` to test your tree integration without launching a headless browser:

```ts
import { renderMermaidInTree } from "@domphy/mermaid"
import { describe, it, expect } from "vitest"

describe("renderMermaidInTree", () => {
  it("replaces mermaid blocks and preserves other nodes", async () => {
    const input = [
      { h1: "Docs" },
      { pre: [
        { code: "flowchart LR; A-->B", dataLanguage: "mermaid", class: "language-mermaid" },
      ]},
      { p: "Below the diagram." },
    ]

    const output = await renderMermaidInTree(input, {
      renderer: async (code) => `<svg data-testid="mermaid">${code}</svg>`,
    })

    expect(output[0]).toEqual({ h1: "Docs" })
    expect(output[1]).toMatchObject({ div: expect.stringContaining("<svg"), class: "mermaid" })
    expect(output[2]).toEqual({ p: "Below the diagram." })
  })
})
```

Using a custom renderer avoids the `@mermaid-js/mermaid-cli` dependency in test environments entirely.

## CI / headless browser configuration

On CI, Chrome may need extra sandbox flags. Pass them via the `puppeteer` option:

```ts
import { renderMermaidToSvg } from "@domphy/mermaid"

const isCI = process.env.CI === "true"

const svg = await renderMermaidToSvg(source, {
  theme: "default",
  puppeteer: isCI
    ? { args: ["--no-sandbox", "--disable-setuid-sandbox"] }
    : {},
})
```

To use a specific Chrome binary instead of the one bundled with `@mermaid-js/mermaid-cli`:

```ts
const svg = await renderMermaidToSvg(source, {
  puppeteer: {
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox"],
  },
})
```

## Build script example

A typical Vite / SSG build step that pre-renders all diagrams in a content directory:

```ts
// scripts/render-diagrams.ts
import { readFile, writeFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { parseMarkdown } from "@domphy/markdown"
import { renderMermaidInTree } from "@domphy/mermaid"

const contentDir = "content"
const outputDir = "src/generated"

const files = await readdir(contentDir)
const markdownFiles = files.filter((f) => f.endsWith(".md"))

for (const file of markdownFiles) {
  const raw = await readFile(join(contentDir, file), "utf8")
  const { body } = parseMarkdown(raw)
  const rendered = await renderMermaidInTree(body, {
    theme: "neutral",
    cacheDir: "node_modules/.cache/domphy-mermaid",
  })

  const outputFile = join(outputDir, file.replace(".md", ".json"))
  await writeFile(outputFile, JSON.stringify(rendered), "utf8")
  console.log(`Rendered: ${file}`)
}
```

Because the cache is keyed by content hash, only diagrams that changed since the last build are re-rendered.
