# AGENTS.md — Domphy

Instructions for AI agents writing/editing Domphy code. (Human contributors: same rules apply.) This is the canonical short spec. More machine context: `apps/web/public/llms.txt` (index), `apps/web/public/llms-full.txt` (one-shot dump), `apps/web/public/manifest.json` (structured patch/package index), the `@domphy/mcp` server (tools for MCP agents), and the Claude Code skill `domphy`.

## What Domphy is

A patch-based, framework-agnostic UI runtime. No JSX, no virtual DOM, no build step required. UIs are **plain objects keyed by HTML tag**; behavior/style is added by **patches** applied via the `$` array. Reactivity is listener-based (`toState`). SSR + hydration are built in.

```ts
import { toState } from "@domphy/core"
import { button } from "@domphy/ui"

const count = toState(0)
const App = {
  div: [
    { p: (l) => `Count: ${count.get(l)}` },
    { button: "Add", $: [button({ color: "primary" })], onClick: () => count.set(count.get() + 1) },
  ],
}
```

## Core rules

- **Plain objects keyed by tag.** First key = HTML tag; value = content (string | number | array | `(listener) => value` | `null` for void tags).
- **Patches via `$`**, never wrapper components. Compose multiple: `$: [button(), tooltip({ content: "..." })]`. The native element always wins over patch defaults.
- **Reactivity:** read with `(listener) => state.get(listener)`; write in events with `state.set(...)`. One-way data flow. Prefer `RecordState` for per-key reactivity. A controlled input (`value: (l) => s.get(l)` + `onInput: (e) => s.set(e.target.value)`) is safe.
- **Never inline typography styles** (fontSize, color, margin, lineHeight…). Use typography patches: `small()`, `paragraph()`, `heading()`, `link()`, `strong()`, `emphasis()`, `code()`, `keyboard()`.
- **Theme, not hard-coded values:** `themeColor()`, `themeSpacing()`, `themeSize()`, `themeDensity()`; tones are `inherit`/`base`/`shift-N` (not `surface`/`text`).
- **`_key`** on dynamic/reordered child lists (identity for reconcile). It is not DOM id / business identity.
- **Lifecycle hooks** (`_onMount`, `_onBeforeRemove(node, done)` — must call `done()`, `_onRemove`) for imperative/3rd-party integration; events stay flat (`onClick`, `onInput`).
- **Comments in code: English only.** Names: descriptive, no abbreviations (`index` not `i` except loops; `listener` `l`, event `e`, node `node`).
- **Self-check:** run `@domphy/doctor` `diagnose(app)` (or `validate(app)`) on what you produce and fix every reported issue before finishing (rules: inline-typography, void-content, missing-key, duplicate-key, unstable-key, unknown-tag).

## Package map (current)

| Package | Use |
| --- | --- |
| `@domphy/core` | runtime: element/reactivity/lifecycle/SSR/CSS-in-JS (`toState`, `RecordState`, `ElementNode`; derived: `computed`/`effect`/`effectScope`/`batch`/`untrack`) |
| `@domphy/theme` | design tokens (`themeColor`/`themeSpacing`/`themeSize`/`themeApply`) |
| `@domphy/ui` | ~75 patches (`button`, `card`, `dialog`, `select`, `motion`, `formGroup`, …) |
| `@domphy/query` | async state — TanStack query-core port; adapter `createQuery`/`createMutation`/`createInfiniteQuery` at `@domphy/query/domphy` |
| `@domphy/table` | headless tables — table-core port; adapter `createDomphyTable` at `@domphy/table/domphy` |
| `@domphy/router` | type-safe routing — router-core port; `createRouter`/`createRoute` |
| `@domphy/virtual` | virtualization — virtual-core port; adapter `createVirtualizer` at `@domphy/virtual/domphy` |
| `@domphy/form` | forms — form-core port; adapter `createForm` at `@domphy/form/domphy` |
| `@domphy/dnd` | drag & drop — `dragDrop(state, config?)` (wraps `@formkit/drag-and-drop`) |
| `@domphy/app` | Next.js App Router-style framework: routes/layouts/loaders(SWR)/metadata/middleware/parallel+intercepting routes/**lazy code-split routes** (`lazy: () => import(...)`)/SSR+streaming/API routes |
| `@domphy/doctor` | static analyzer — `diagnose(element)` / `validate(element)` flag non-idiomatic trees. **Run it on your output and fix the report.** |
| `@domphy/floating` | anchor positioning (vendored floating-ui, zero-dep) — internal to `@domphy/ui` overlays |
| `@domphy/palette` | color-palette engine: `generateRamp` + `Ramp`/`Palette` quality metrics (design-time companion to theme) |
| `@domphy/markdown` | parse Markdown → Domphy element trees for SSR/SSG (`parseMarkdown`, `tokensToDomphy`); powers this docs site |
| `@domphy/mermaid` | render Mermaid diagrams (build-time `renderMermaidInTree` SVG + client `mermaidClient()` patch) |
| `@domphy/mcp` | MCP server exposing patches/packages/rules + doctor + app-block registry to agents |

Data/logic packages are **1-1 TanStack core ports** (byte-identical upstream API) + a thin Domphy adapter at the `/domphy` subpath; `@domphy/core` is their peer dependency.

## Removed / do NOT use

- `@domphy/ui` `form()` and `field()` patches, and `FormState` / `FieldState` classes — **removed**. Use `@domphy/form` (`createForm`). `formGroup()` (layout) still exists.
- No `@domphy/next` (renamed to `@domphy/app`).

## Animation

Use the `motion()` patch (`@domphy/ui`): declarative `initial`/`animate`/`exit` via the Web Animations API, with reactive `animate` (pass a `State`). Reorder/FLIP: `transitionGroup()`. Hover/tap: CSS. No `framer-motion` needed — enter/exit/layout map to Domphy's native lifecycle.

## Conventions

- Build: tsup (packages), DomphyPress (docs — `apps/web/domphypress/`, built on `@domphy/app` + `@domphy/markdown`). Tests: Vitest (+ jsdom for DOM).
- Before editing UI code, read the relevant patch doc (`apps/web/docs/ui/patches/*.md`) or use the `domphy` skill — each patch has its own prop contract.
- Keep this file, `apps/web/public/llms.txt`, and `apps/web/scripts/llms-full.mjs` in sync when the public API changes.
