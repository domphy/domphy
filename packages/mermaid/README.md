# @domphy/mermaid

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/mermaid/) · [npm](https://www.npmjs.com/package/@domphy/mermaid)

Render [Mermaid](https://mermaid.js.org/) diagrams for Domphy.

Two complementary paths:

- **Build-time / SSG** — render diagrams to inline SVG with a headless browser
  (via [`@mermaid-js/mermaid-cli`](https://github.com/mermaid-js/mermaid-cli)),
  with an on-disk render cache and a tree integration for
  [`@domphy/markdown`](../markdown). Diagrams become plain SVG in your HTML, so
  the browser ships no Mermaid runtime.
- **Client-side** — the `mermaidClient()` patch renders a diagram in the browser
  at mount time, using the `mermaid` library (an optional peer dependency).

## Install

```sh
pnpm add @domphy/mermaid
```

`@domphy/core` is a peer dependency. `@mermaid-js/mermaid-cli` is a direct
dependency and powers the build-time path; it manages its own headless browser
(Puppeteer / Chrome) internally, so you do not install or configure Puppeteer
yourself. `mermaid` is an **optional** peer dependency, needed only for the
client-side patch.

## Build-time rendering

```ts
import { renderMermaidToSvg } from "@domphy/mermaid";

const svg = await renderMermaidToSvg("graph TD; A-->B;", {
  theme: "dark",
  background: "transparent",
});
// svg === "<svg ...>...</svg>"
```

`MermaidOptions`:

| Option          | Type                                          | Default         |
| --------------- | --------------------------------------------- | --------------- |
| `theme`         | `"default" \| "dark" \| "neutral" \| "forest"` | `"default"`     |
| `background`    | `string` (`"transparent"` for none)           | `"transparent"` |
| `mermaidConfig` | `Record<string, unknown>`                     | —               |
| `css`           | `string` (injected into the render page)       | —               |
| `puppeteer`     | `Record<string, unknown>` (launch options)     | —               |

Mermaid syntax errors are thrown as an `Error` that includes the diagram source,
never silently swallowed.

## Render cache

```ts
import { renderMermaidCached } from "@domphy/mermaid";

// First call renders; later calls with the same source + options read the SVG
// back from disk.
const svg = await renderMermaidCached("graph TD; A-->B;", {
  cacheDir: "node_modules/.cache/domphy-mermaid", // default
});
```

The cache key is a stable SHA-256 hash of the normalized source plus the
output-affecting options (no time or randomness), so repeated builds are fast.
Pass `cache: false` to bypass it.

## Markdown tree integration

`@domphy/markdown` emits a fenced ` ```mermaid ` block as:

```js
{ pre: [{ code: "<escaped source>", dataLanguage: "mermaid", class: "language-mermaid" }] }
```

`renderMermaidInTree` finds those blocks anywhere in the tree, renders each to
SVG (through the cache), and replaces the node with an SVG-wrapping element:

```js
{ div: "<svg ...>...</svg>", class: "mermaid", ariaLabel: "diagram" }
```

```ts
import { parse } from "@domphy/markdown";
import { renderMermaidInTree } from "@domphy/mermaid";

const { body } = parse(markdownSource);
const rendered = await renderMermaidInTree(body, { theme: "neutral" });
```

All other nodes — siblings, nesting, attributes — are left untouched. Identical
diagram sources are rendered only once, and distinct diagrams render
concurrently. Inject a custom `renderer` to test without a browser:

```ts
await renderMermaidInTree(body, {
  renderer: async (code) => `<svg data-src="${code}"></svg>`,
});
```

## Client-side patch

Render in the browser instead of at build time:

```ts
import { mermaidClient } from "@domphy/mermaid";

const App = {
  pre: [{ code: "graph TD; A-->B;" }],
  $: [mermaidClient({ theme: "dark" })],
};
```

On mount the patch reads the source from the element (preferring an inner
`<code>`), renders it with the `mermaid` library, and swaps in the SVG. Install
`mermaid` to use this path:

```sh
pnpm add mermaid
```

## License

MIT
