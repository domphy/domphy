# Domphy

Domphy is **the AI-friendly UI framework** — the whole API is learnable from one spec file (`llms.txt` / `AGENTS.md`) and self-correcting via a built-in validator (`@domphy/doctor`), so AI agents write correct Domphy despite little training data (see [Building with AI](#building-with-ai)). Under the hood it's patch-based and **framework-agnostic**: plain objects, no JSX, no virtual DOM, no build step required.

## Packages

Core runtime + design system:

- `@domphy/core` — rendering, reactivity, lifecycle, SSR, and CSS-in-JS runtime
- `@domphy/theme` — context-aware color, size, and spacing tokens
- `@domphy/ui` — 74 ready-made patches (`button`, `card`, `dialog`, `motion`, …) built on core + theme

Data & logic — **1-1 ports of the TanStack cores** (byte-identical upstream API) + a thin Domphy adapter at the `/domphy` subpath:

- `@domphy/query` — async state — port of `@tanstack/query-core` (`createQuery`/`createMutation`/`createInfiniteQuery`)
- `@domphy/table` — headless tables — port of `@tanstack/table-core` (`createDomphyTable`)
- `@domphy/router` — type-safe routing — port of `@tanstack/router-core` (`createRouter`/`createRoute`)
- `@domphy/virtual` — virtualization — port of `@tanstack/virtual-core` (`createVirtualizer`)
- `@domphy/form` — forms — port of `@tanstack/form-core` (`createForm`)

App layer & tools:

- `@domphy/palette` — color-palette engine: generate accessible ramps + measure palette quality (5 CIELAB metrics); the design-time companion to `@domphy/theme`
- `@domphy/dnd` — drag & drop / sortable lists (`dragDrop`, wraps `@formkit/drag-and-drop`)
- `@domphy/app` — Next.js App Router-style framework: nested routes/layouts, loaders with stale-while-revalidate, metadata, middleware, parallel + intercepting routes, lazy code-split routes, SSR + streaming, API routes
- `@domphy/markdown` — parse Markdown into Domphy element trees for SSR/SSG (markdown-it → Domphy; frontmatter, TOC, anchors). This docs site is built on it.
- `@domphy/mermaid` — render Mermaid diagrams (build-time inline SVG via mermaid-cli + a client patch)
- `@domphy/doctor` — static analyzer that flags non-idiomatic element trees (`diagnose`/`validate`); powers AI self-correction
- `@domphy/mcp` — MCP server exposing patches/packages/rules + the doctor + the app-block registry to AI agents
- `@domphy/floating` — anchor positioning (vendored [floating-ui](https://github.com/floating-ui/floating-ui), zero-dependency); powers the `@domphy/ui` overlays so it has no third-party runtime dependency

`@domphy/core` is a peer dependency of the data/logic packages, so a consumer installs **one** copy.

In rough ecosystem terms: `@domphy/core` is the runtime layer (≈ `react-dom` + SSR + CSS-in-JS in one), `@domphy/theme` + `@domphy/ui` are the design-system layer (≈ MUI), and the data packages are the TanStack suite — same code, no React.

## Building with AI

Domphy treats AI as a first-class consumer. Because most LLMs have little Domphy training data, the framework is built to be **learnable in-context and self-correcting**:

- **[`AGENTS.md`](./AGENTS.md)** — the canonical cross-tool agent spec (Cursor, Claude Code, Copilot, Codex, Aider all read it).
- **[`llms.txt`](https://www.domphy.com/llms.txt)** — curated index: rules + links to every doc page and patch.
- **[`llms-full.txt`](https://www.domphy.com/llms-full.txt)** — one-shot dump: rules + quickstart + every core/theme/package doc + every patch source. Auto-generated, never drifts.
- **[`@domphy/doctor`](https://www.domphy.com/docs/doctor/)** — run `diagnose(app)` on generated code and feed the report back to the model; it fixes the issues itself. The feedback loop that lets agents write correct Domphy despite thin training data.

See the [AI guide](https://www.domphy.com/docs/ai) for per-tool setup.

## Install

Most apps start with the UI layer (pulls core + theme):

```bash
npm install @domphy/ui
```

Add what you need:

```bash
npm install @domphy/query    # async data
npm install @domphy/table    # data tables
npm install @domphy/router   # routing
npm install @domphy/virtual  # virtualization
npm install @domphy/form     # forms
npm install @domphy/dnd      # drag & drop
npm install @domphy/app      # app framework (SSR/streaming/routing)
npm install -D @domphy/doctor # validate Domphy code (AI/CI)
```

## Documentation

Full docs: [domphy.com](https://www.domphy.com) — [Core](https://www.domphy.com/docs/core/) · [Theme](https://www.domphy.com/docs/theme/) · [UI](https://www.domphy.com/docs/ui/) · [Query](https://www.domphy.com/docs/query/) · [Router](https://www.domphy.com/docs/router/) · [Table](https://www.domphy.com/docs/table/) · [Virtual](https://www.domphy.com/docs/virtual/) · [Form](https://www.domphy.com/docs/form/) · [DnD](https://www.domphy.com/docs/dnd/) · [Palette](https://www.domphy.com/docs/palette/) · [App](https://www.domphy.com/docs/app/) · [Markdown](https://www.domphy.com/docs/markdown/) · [Mermaid](https://www.domphy.com/docs/mermaid/) · [Doctor](https://www.domphy.com/docs/doctor/) · [Integrations](https://www.domphy.com/docs/integrations/)

## Monorepo

`packages/{core,theme,ui,query,table,router,virtual,form,dnd,palette,doctor,mcp,floating,app,markdown,mermaid}` + `apps/web` (docs website, built with DomphyPress — `apps/web/domphypress/` on `@domphy/app` + `@domphy/markdown`).
