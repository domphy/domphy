---
title: "Extending Markdown"
description: "Built-in Markdown containers, code-group tabs, file imports, and badges."
---

# Extending Markdown

`@domphy/press` ships a VitePress-compatible Markdown pipeline built on remark + GFM. There is no config API for adding custom plugins yet (`markdown` in `press.config.ts` is reserved for a future release). The built-in feature set covers the most common documentation patterns.

## Containers (admonitions)

Use `:::type` to create styled callout blocks. The type becomes a CSS class `custom-block <type>`:

```markdown
::: tip
A helpful tip.
:::

::: tip My custom title
Tip with a custom title.
:::

::: warning
Something to watch out for.
:::

::: danger
Dangerous action — use with care.
:::

::: info
Informational note.
:::
```

All supported container types:

| Type | Default title |
|---|---|
| `tip` | TIP |
| `warning` | WARNING |
| `info` | INFO |
| `danger` | DANGER |
| `note` | NOTE |
| `abstract` | ABSTRACT |
| `success` | SUCCESS |
| `question` | QUESTION |
| `failure` | FAILURE |
| `bug` | BUG |
| `example` | EXAMPLE |
| `quote` | QUOTE |

## Details (collapsible)

```markdown
::: details Click to expand
Hidden content revealed on click.
:::

::: details Custom summary text
Content here.
:::
```

Renders as a native `<details>`/`<summary>` element.

## Steps

```markdown
::: steps
**Install the package:**

```bash
pnpm add @domphy/press
```

**Create `press.config.ts`:**

```ts
import { defineConfig } from "@domphy/press"
export default defineConfig({ title: "My Docs", ... })
```

**Run the dev server:**

```bash
npx domphy-press dev
```
:::
```

Renders as a numbered step sequence (CSS counter via `.custom-block.steps`).

## Card grid

```markdown
::: card-grid

::: card Features
- Fast static output
- Reactive Domphy theming
:::

::: link-card [Getting Started](/guide/)
Everything you need to get up and running.
:::

:::
```

`card` = styled content card; `link-card [Label](href)` = clickable card that links to a page.

## Code-group tabs

Group multiple code blocks into a tabbed panel:

````markdown
::: code-group
```bash [npm]
npm install @domphy/press
```
```bash [pnpm]
pnpm add @domphy/press
```
```bash [yarn]
yarn add @domphy/press
```
:::
````

The label in `[brackets]` after the language becomes the tab name.

## File imports (`<<<`)

Embed a file from the repo directly into a code block:

```markdown
<<< ./src/example.ts

<<< ./src/example.ts [Custom Label]
```

The file extension determines the language automatically. The `@/` prefix resolves from the docs root:

```markdown
<<< @/snippets/config.ts
```

## `<Badge>` inline

```markdown
Feature <Badge type="tip" text="New" /> is available.

<Badge type="warning" text="Beta" />
<Badge type="danger" text="Deprecated" />
<Badge type="info" text="Experimental" />
```

Renders as a small inline label styled by the press theme. Available types: `tip`, `info`, `warning`, `danger`.

## Frontmatter

Every Markdown file supports YAML frontmatter — available in the layout as `frontmatter`:

```markdown
---
title: "My Page"
description: "A short description."
date: 2024-01-15
tags: [guide, advanced]
---

# Content starts here
```

Access in a custom layout slot:

```ts
// press.config.ts
export default defineConfig({
  themeConfig: {
    slots: {
      docFooter: ({ frontmatter }) =>
        frontmatter.date
          ? { p: `Last updated: ${frontmatter.date}`, class: "doc-date" }
          : null,
    },
  },
})
```
