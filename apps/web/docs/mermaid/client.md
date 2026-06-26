---
title: "Client-Side Rendering"
description: "Patterns for rendering Mermaid diagrams in the browser with @domphy/mermaid — static mount, reactive source, CDN loading, and error handling."
---

# Client-Side Rendering

The `mermaidClient()` function returns a Domphy patch that renders a Mermaid diagram in the browser at mount time. Apply it to any element whose text content is valid Mermaid source.

## Basic usage

```ts
import { mermaidClient } from "@domphy/mermaid"

const DiagramView = {
  pre: [{ code: `flowchart LR
  A[User] --> B{Auth?}
  B -->|yes| C[Dashboard]
  B -->|no| D[Login]` }],
  $: [mermaidClient()],
}
```

On mount the patch:
1. Reads the source from the element (preferring an inner `<code>` element, falling back to the element's own `textContent`)
2. Calls `mermaid.initialize()` with your options
3. Calls `mermaid.render()` to produce SVG
4. Replaces the element's `innerHTML` with the SVG
5. Adds class `"mermaid"` and sets `aria-label="diagram"`

`mermaid` is an **optional** peer dependency. Install it alongside `@domphy/mermaid`:

```bash
pnpm add mermaid
```

## Options

```ts
import { mermaidClient } from "@domphy/mermaid"

const DiagramView = {
  pre: [{ code: "graph TD; A-->B;" }],
  $: [mermaidClient({
    theme: "dark",
    background: "transparent",
    mermaidConfig: {
      fontFamily: "monospace",
      fontSize: 14,
      startOnLoad: false,
    },
  })],
}
```

| Option | Type | Default |
|--------|------|---------|
| `theme` | `"default" \| "dark" \| "neutral" \| "forest"` | `"default"` |
| `background` | `string` | `"transparent"` |
| `mermaidConfig` | `Record<string, unknown>` | — |
| `loadMermaid` | `() => MermaidBrowserModule \| Promise<MermaidBrowserModule>` | dynamic `import("mermaid")` |

`mermaidConfig` is passed directly to `mermaid.initialize()`, so any option the Mermaid library accepts works here.

## Reactive theme switching

To switch the diagram theme when the page theme changes, use `toState` and pass the theme reactively. Because `mermaidClient()` options are read once at mount time, the element must be remounted to pick up a new theme.

Force a remount by using `_key` in a list — Domphy removes and re-adds an element when its `_key` changes:

```ts
import { toState } from "@domphy/core"
import { mermaidClient } from "@domphy/mermaid"

const isDark = toState(false)

const source = `sequenceDiagram
  A->>B: Request
  B-->>A: Response`

// Changing isDark updates the _key, forcing the element to remount and
// the patch to re-read the theme.
const App = {
  div: (l) => [
    {
      pre: [{ code: source }],
      $: [mermaidClient({ theme: isDark.get(l) ? "dark" : "default" })],
      _key: isDark.get(l) ? "dark" : "light",
    },
  ],
  onClick: () => isDark.set(!isDark.get()),
}
```

## Dynamic diagram source

To render different diagram source strings at runtime, update `_key` to the source string itself. Domphy remounts the element whenever the key changes, giving the patch a fresh `_onMount` call with the new content:

```ts
import { toState } from "@domphy/core"
import { mermaidClient } from "@domphy/mermaid"

const source = toState(`flowchart LR
  A --> B`)

const LiveDiagram = {
  div: (l) => [
    {
      pre: [{ code: source.get(l) }],
      $: [mermaidClient()],
      _key: source.get(l),
    },
  ],
}
```

The `_key` approach works reliably for lists. For a single element outside a list, wrap it in a single-item array as shown above.

## Error handling

When the Mermaid library fails to render (for example, due to a syntax error), the patch logs the failure with `console.error` and leaves the element's existing content unchanged. It never throws from a lifecycle hook.

The console output includes both the error message and the diagram source:

```
@domphy/mermaid: client render failed.
Parse error on line 2: ...
--- source ---
flowchart LR; BAD SYNTAX
```

If you want to surface errors to users, listen for them via a wrapper:

```ts
import { toState } from "@domphy/core"
import { mermaidClient } from "@domphy/mermaid"

const hasError = toState(false)

// Override loadMermaid to intercept failures.
const DiagramWithFeedback = (source: string) => ({
  div: [
    {
      pre: [{ code: source }],
      $: [mermaidClient({
        loadMermaid: async () => {
          const mermaid = (await import("mermaid")).default
          const originalRender = mermaid.render.bind(mermaid)
          mermaid.render = async (...args) => {
            try {
              const result = await originalRender(...args)
              hasError.set(false)
              return result
            } catch (error) {
              hasError.set(true)
              throw error
            }
          }
          return mermaid
        },
      })],
    },
    (l) => hasError.get(l)
      ? { p: "Diagram syntax error — check your Mermaid source.", class: "error" }
      : null,
  ],
})
```

## Custom loader (`loadMermaid`)

By default the patch loads `mermaid` with a dynamic `import("mermaid")`. Override `loadMermaid` to use a pre-loaded instance or a specific version:

```ts
import { mermaidClient } from "@domphy/mermaid"

// Use a globally loaded copy (e.g. from a <script> tag)
const DiagramView = {
  pre: [{ code: "graph TD; A-->B;" }],
  $: [mermaidClient({
    loadMermaid: () => (window as unknown as { mermaid: unknown }).mermaid,
  })],
}
```

## Loading from CDN (IIFE global build)

If you load Domphy from a CDN script tag without a bundler, use the `@domphy/mermaid` global build alongside the Mermaid CDN script:

```html
<!-- Load Mermaid from CDN first -->
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<!-- Then load the Domphy mermaid global build -->
<script src="https://cdn.jsdelivr.net/npm/@domphy/mermaid/dist/global.js"></script>

<script>
  // mermaidClient is available on window.DomphyMermaid
  const { mermaidClient } = window.DomphyMermaid

  const App = {
    pre: [{ code: "graph TD; A-->B;" }],
    $: [mermaidClient({ theme: "neutral" })],
  }
</script>
```

The global build reads `window.mermaid` by default, so the Mermaid CDN script must be loaded before any Domphy element mounts.

## When to use client-side vs build-time

| Situation | Recommended path |
|-----------|------------------|
| Static docs site / SSG | `renderMermaidInTree` (build-time) — SVG in HTML, no runtime |
| Diagram source is dynamic (user input) | `mermaidClient()` |
| Live preview editor | `mermaidClient()` with `_key` on source |
| Serverless build host without Chrome | `mermaidClient()` |
| Best first-paint performance | Build-time (no layout shift, no JS) |

See the [Build-time integration](/docs/mermaid/build) page for the SSG pipeline.
