# Domphy

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/) · [Quickstart](https://domphy.com/docs/quickstart/) · [npm](https://www.npmjs.com/package/@domphy/core)

```ts
const count = toState(0)

const App = {
  div: [
    { p: (l) => `Count: ${count.get(l)}` },
    { button: "Add", $: [button({ color: "primary" })], onClick: () => count.set(count.get() + 1) },
  ],
}
```

**UI as plain objects. No JSX, no compiler.**

`{ button: 'Save', $: [button()] }` — that's a Domphy component. Paste it in a script tag and it runs. No build step, no framework overhead, no wrappers around your DOM.

**Good fit for tool apps** (plugins, extensions, dashboards, panels): you get reactivity + 87 polished UI patches + a full design system without shipping a 40 kB runtime or setting up a JSX compiler.

**Works well with AI**: plain objects are what LLMs generate naturally, and `@domphy/doctor` validates the output — the model reads the report and self-corrects (see [Building with AI](#building-with-ai)).

## Packages

Core runtime + design system:

- `@domphy/core` — rendering, reactivity (`toState`/`RecordState`/`computed`/`effect`/`effectScope`/`batch`/`untrack`/`flushSync`), lifecycle, SSR, CSS-in-JS; exports `ReadableState<T>`, `ValueOrState<T>`, `configure({ cspNonce })`
- `@domphy/theme` — context-aware color, size, and spacing tokens
- `@domphy/ui` — 87 ready-made patches (`button`, `card`, `dialog`, `motion`, `errorBoundary`, …) built on core + theme

Data & logic — framework-agnostic API at the main entry + a thin Domphy adapter at the `/domphy` subpath:

- `@domphy/query` — async state (`createQuery`/`createMutation`/`createInfiniteQuery`)
- `@domphy/table` — headless tables (`createDomphyTable`)
- `@domphy/router` — type-safe routing (`createRouter`/`createRoute`/`createRootRoute`/`createRootRouteWithContext`)
- `@domphy/virtual` — virtualization (`createVirtualizer`)
- `@domphy/form` — forms (`createForm`)

App layer & tools:

- `@domphy/palette` — color-science toolkit: measure & validate palette quality (5 CIELAB metrics); the design-time companion to `@domphy/theme`
- `@domphy/dnd` — drag & drop / sortable lists (`dragDrop`, wraps `@formkit/drag-and-drop`)
- `@domphy/app` — Next.js App Router-style framework: nested routes/layouts, loaders with stale-while-revalidate, metadata, middleware, parallel + intercepting routes, lazy code-split routes, SSR + streaming, API routes
- `@domphy/markdown` — parse Markdown into Domphy element trees for SSR/SSG (markdown-it → Domphy; frontmatter, TOC, anchors). This docs site is built on it.
- `@domphy/mermaid` — render Mermaid diagrams (build-time inline SVG via mermaid-cli + a client patch)
- `@domphy/doctor` — static analyzer that flags non-idiomatic element trees (`diagnose`/`validate`) and applies lossless autofixes (`fix`); powers AI self-correction
- `@domphy/mcp` — MCP server exposing patches/packages/rules + the doctor + the app-block registry to AI agents
- `@domphy/floating` — anchor positioning (vendored [floating-ui](https://github.com/floating-ui/floating-ui), zero-dependency); powers the `@domphy/ui` overlays so it has no third-party runtime dependency
- `create-domphy` — scaffolder: `npm create domphy@latest <dir>` writes a Vite + TypeScript starter with AGENTS.md

`@domphy/core` is a peer dependency of the data/logic packages, so a consumer installs **one** copy.

## Building with AI

Plain objects are what LLMs generate naturally. JSX is not. That's the core reason Domphy AI output is more reliable than React — and `@domphy/doctor` closes the remaining gap with a self-correction loop:

When an agent generates Domphy code → run `diagnose(app)` → feed the report back → the model fixes its own output. No manual debugging. Domphy is built to make this loop work:

- **[`AGENTS.md`](./AGENTS.md)** — the canonical cross-tool agent spec (Cursor, Copilot, Codex, Aider, and any AI editor that reads `AGENTS.md`).
- **[`llms.txt`](https://domphy.com/llms.txt)** — curated index: rules + links to every doc page and patch.
- **[`llms-full.txt`](https://domphy.com/llms-full.txt)** — one-shot dump: rules + quickstart + every core/theme/package doc + every patch source. Auto-generated, never drifts.
- **[`@domphy/doctor`](https://domphy.com/docs/doctor/)** — run `diagnose(app)` on generated code and feed the report back to the model; it fixes the issues itself. The feedback loop that lets agents write correct Domphy despite thin training data.

See the [AI guide](https://domphy.com/docs/ai) for per-tool setup.

## Install

Scaffold a new project (Vite + TS starter, includes `AGENTS.md`):

```bash
npm create domphy@latest my-app
```

Or add Domphy to an existing project — most apps start with the UI layer (pulls core + theme):

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

Full docs: [domphy.com](https://domphy.com) — [Core](https://domphy.com/docs/core/) · [Theme](https://domphy.com/docs/theme/) · [UI](https://domphy.com/docs/ui/) · [Query](https://domphy.com/docs/query/) · [Router](https://domphy.com/docs/router/) · [Table](https://domphy.com/docs/table/) · [Virtual](https://domphy.com/docs/virtual/) · [Form](https://domphy.com/docs/form/) · [DnD](https://domphy.com/docs/dnd/) · [Palette](https://domphy.com/docs/palette/) · [App](https://domphy.com/docs/app/) · [Markdown](https://domphy.com/docs/markdown/) · [Mermaid](https://domphy.com/docs/mermaid/) · [Doctor](https://domphy.com/docs/doctor/) · [Integrations](https://domphy.com/docs/integrations/)

## Monorepo

`packages/{core,theme,ui,query,table,router,virtual,form,dnd,palette,doctor,mcp,floating,app,markdown,mermaid,create-domphy}` + `apps/web` (`domphy-web` — docs site, DomphyPress) + `bench` (benchmarks).
