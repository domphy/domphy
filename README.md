# Domphy

Domphy is a patch-based UI system for the web.

It is split into 3 packages:

- `@domphy/core` - rendering, reactivity, SSR, and CSS-in-JS runtime
- `@domphy/theme` - context-aware color, size, and spacing
- `@domphy/ui` - ready-made patches built on top of core and theme

Plus optional layers:

- `@domphy/query` - async state management, a 1-1 port of `@tanstack/query-core`
- `@domphy/router` - type-safe routing, a 1-1 port of `@tanstack/router-core`
- `@domphy/table` - headless table logic, a 1-1 port of `@tanstack/table-core`

Package sizes on the docs site are described as:

- `@domphy/core` - `30kb` minified
- `@domphy/theme` - `8kb` minified
- `@domphy/ui` - `80kb` minified
- `@domphy/query` - `49kb` minified
- `@domphy/router` - `69kb` minified
- `@domphy/table` - `59kb` minified

In rough ecosystem terms:

- `@domphy/core` is the runtime layer, comparable to `react-dom` + SSR rendering + CSS-in-JS in one package
- `@domphy/theme` and `@domphy/ui` together are the design-system layer, comparable to what many teams expect from MUI

## Documentation

Full documentation: [domphy.com](https://www.domphy.com)

- [Core docs](https://www.domphy.com/docs/core/)
- [Theme docs](https://www.domphy.com/docs/theme/)
- [UI docs](https://www.domphy.com/docs/ui/)
- [Query docs](https://www.domphy.com/docs/query/)
- [Router docs](https://www.domphy.com/docs/router/)
- [Table docs](https://www.domphy.com/docs/table/)
- [Integrations](https://www.domphy.com/docs/integrations/)

## Building with AI

Domphy ships an LLM-ready context bundle so any AI (Claude, ChatGPT, Cursor, Codex, Gemini, Copilot) can generate correct Domphy code without guessing.

- [`llms.txt`](https://www.domphy.com/llms.txt) — curated index, links to every doc page and patch
- [`llms-full.txt`](https://www.domphy.com/llms-full.txt) — one-shot full dump: critical rules + quickstart + every core/theme doc + every patch source file (~200KB)

See the [AI guide](https://www.domphy.com/docs/ai) for tool-specific setup (Claude Code, Cursor, Codex, Aider, Copilot, ChatGPT, Gemini).

## Install

Most apps can start with:

```bash
npm install @domphy/ui
```

Or install packages separately:

```bash
npm install @domphy/core
npm install @domphy/theme
npm install @domphy/ui
```

For async data fetching and caching:

```bash
npm install @domphy/query
```

For routing:

```bash
npm install @domphy/router
```

For data tables:

```bash
npm install @domphy/table
```

## Monorepo

- `packages/core` - `@domphy/core`
- `packages/theme` - `@domphy/theme`
- `packages/ui` - `@domphy/ui`
- `packages/query` - `@domphy/query`
- `packages/router` - `@domphy/router`
- `packages/table` - `@domphy/table`
- `apps/web` - docs website and demos
