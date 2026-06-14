# Domphy

Domphy is a patch-based, **framework-agnostic** UI system for the web — plain objects, no JSX, no virtual DOM, no build step required. It is also designed to be the **most AI-friendly** UI framework: the whole API is learnable from one spec file and self-correcting via a built-in validator (see [Building with AI](#building-with-ai)).

## Packages

Core runtime + design system:

- `@domphy/core` — rendering, reactivity, lifecycle, SSR, and CSS-in-JS runtime
- `@domphy/theme` — context-aware color, size, and spacing tokens
- `@domphy/ui` — ~75 ready-made patches (`button`, `card`, `dialog`, `motion`, …) built on core + theme

Data & logic — **1-1 ports of the TanStack cores** (byte-identical upstream API) + a thin Domphy adapter at the `/domphy` subpath:

- `@domphy/query` — async state — port of `@tanstack/query-core` (`createQuery`/`createMutation`/`createInfiniteQuery`)
- `@domphy/table` — headless tables — port of `@tanstack/table-core` (`createDomphyTable`)
- `@domphy/router` — type-safe routing — port of `@tanstack/router-core` (`createRouter`/`createRoute`)
- `@domphy/virtual` — virtualization — port of `@tanstack/virtual-core` (`createVirtualizer`)
- `@domphy/form` — forms — port of `@tanstack/form-core` (`createForm`)

App layer & tools:

- `@domphy/dnd` — drag & drop / sortable lists (`dragDrop`, wraps `@formkit/drag-and-drop`)
- `@domphy/app` — Next.js App Router-style framework: nested routes/layouts, loaders with stale-while-revalidate, metadata, middleware, parallel + intercepting routes, SSR + streaming, API routes
- `@domphy/doctor` — static analyzer that flags non-idiomatic element trees (powers AI self-correction)

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

Full docs: [domphy.com](https://www.domphy.com) — [Core](https://www.domphy.com/docs/core/) · [Theme](https://www.domphy.com/docs/theme/) · [UI](https://www.domphy.com/docs/ui/) · [Query](https://www.domphy.com/docs/query/) · [Router](https://www.domphy.com/docs/router/) · [Table](https://www.domphy.com/docs/table/) · [Virtual](https://www.domphy.com/docs/virtual/) · [Form](https://www.domphy.com/docs/form/) · [DnD](https://www.domphy.com/docs/dnd/) · [App](https://www.domphy.com/docs/app/) · [Integrations](https://www.domphy.com/docs/integrations/)

## Monorepo

`packages/{core,theme,ui,query,table,router,virtual,form,dnd,app,doctor}` + `apps/web` (docs website and demos).
