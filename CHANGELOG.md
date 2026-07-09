# Changelog

All notable changes to Domphy are documented here.

Packages are versioned in lockstep. All packages share the same version number.

---

## `@domphy/ui` [0.18.16] — 2026-07-10

### Fixed
- `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker`: removing a floating trigger's anchor while its panel was open (e.g. a settings popover whose row gets deleted) could leave the panel orphaned in the `#domphy-floating` portal instead of closing. Same reused-DOM-node gap as 0.18.15's fix, the other direction — the anchor's one-ever `BeforeRemove` hook (registered only on its true first mount) closed over the FIRST `createFloating()` closure's own state, not whichever later re-render's closure was actually showing the panel. Now routed through a WeakMap keyed by the anchor's live DOM element so the hook always tears down whichever generation is currently live.

---

## `@domphy/ui` [0.18.15] — 2026-07-09

### Fixed
- `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker`: the floating trigger stopped opening after its ancestor re-rendered (`createFloating()`'s `reference`/`rootNode` were only ever captured via a one-time `_onMount` hook, which `ElementNode.patch()` correctly does not re-run on a reused DOM node). Now derived lazily from the trigger's own event handlers, which are live-rebound on every patch.

---

## [0.16.0] — 2026-06-18

### Changed
- `@domphy/doctor`: improved chromametry color hints — raw hex/rgb values now show a nearest-tone suggestion via CIELAB/LCH perceptual match
- `@domphy/doctor`: AI correctness benchmark workspace for ongoing quality tracking

---

## [0.15.0] — 2026-06-15

### Added
- `@domphy/core`: `flushSync()` — drains the reactive queue synchronously (testing, imperative code)
- `@domphy/core`: in-place reactive text node updates (no DOM replacement on text change)
- `@domphy/core`: dev-mode warnings for common authoring mistakes
- `@domphy/theme`: theme memo — stable CSS var references, no re-computation on unchanged tokens
- `@domphy/doctor`: `unknown-tone` rule — catches invalid tone values
- `@domphy/doctor`: `raw-theme-value` rule — catches literal hex/rgb/rem values that should use theme helpers
- `@domphy/doctor`: `fix(element)` — lossless autofix for fixable rule violations
- `@domphy/mcp`: `domphy_fix` tool — apply autofixes via MCP
- `@domphy/mcp`: `domphy_tones` tool — list valid tone values
- `@domphy/ui`: JSDoc on all 74 patches
- `@domphy/ui`: `manifest.json` — machine-readable patch catalog (props schema, examples)
- `@domphy/ui`: `tones.json` — structured tone reference for tooling
- `create-domphy`: scaffolding CLI (`npm create domphy@latest <dir>`) — generates a Vite + TS starter with `AGENTS.md`

---

## [0.14.0] — 2026-06-08

### Added
- `@domphy/ui`: `datePicker()` patch — native date/time picker (single, range, time modes), themed, accessible, zero-dependency

---

## [0.13.0] — 2026-06-04

### Added
- `@domphy/markdown`: new package — parse Markdown to Domphy element trees for SSR/SSG (`parseMarkdown`, `tokensToDomphy`, `splitFrontmatter`, `walkTokens`)
- `@domphy/mermaid`: new package — Mermaid diagrams (build-time SVG via mermaid-cli + client `mermaidClient()` patch)
- `@domphy/core`: `computed()`, `effect()`, `effectScope()`, `batch()`, `untrack()` — derived reactive values and effect scoping
- `@domphy/app`: `lazy()` — code-split routes with prefetch, SSR, and streaming support
- `@domphy/doctor`: `validate(element)` — returns a structured result object (vs `diagnose` which logs)
- `@domphy/doctor`: `duplicate-key` and `unstable-key` rules
- `@domphy/doctor`: app-block registry generator
- `@domphy/mcp`: `domphy_validate` tool — validate element trees via MCP
- `@domphy/mcp`: `list_app_blocks` and `get_app_block` tools — app-block registry discovery

---

## [0.12.0] — 2026-05-28

### Added
- `@domphy/palette`: new package — color palette quality engine: `Ramp`, `Palette`, `Swatch` (5 CIELAB metrics). Design-time companion to `@domphy/theme`. Ported from the Chromametry project.

---

## [0.11.0] — 2026-05-20

### Added
- `@domphy/floating`: new package — anchor positioning (vendored floating-ui, zero third-party runtime dep). Used internally by `@domphy/ui` overlays.

---

## [0.10.0] — 2026-05-12

### Added
- `@domphy/mcp`: new package — MCP server exposing patches, packages, rules, doctor tools, and the app-block registry to AI agents
- `manifest.json` — machine-readable package/patch index at `domphy.com/manifest.json`

---

## [0.9.0] — 2026-05-05

### Added
- `@domphy/doctor`: new package — static analyzer for Domphy element trees. Rules: `inline-typography`, `raw-spacing-value`, `void-content`, `missing-key`, `unknown-tag`. `diagnose(element)` logs violations; used for AI self-correction.

---

## [0.8.0] — 2026-04-28

### Added
- `@domphy/dnd`: new package — drag and drop / sortable lists (`dragDrop`, wraps `@formkit/drag-and-drop`)

---

## [0.7.0] — 2026-04-20

### Added
- `@domphy/ui`: `motion()` patch — declarative enter/exit/layout animations via Web Animations API (`initial`, `animate`, `exit` props)
- `@domphy/ui`: `transitionGroup()` patch — FLIP reorder animations for child lists

---

## [0.6.0] — 2026-04-10

### Added
- `@domphy/virtual`: new package — 1-1 port of `@tanstack/virtual-core` + Domphy adapter (`createVirtualizer` at `@domphy/virtual/domphy`)
- `@domphy/form`: new package — 1-1 port of `@tanstack/form-core` + Domphy adapter (`createForm` at `@domphy/form/domphy`)

### Removed
- `@domphy/ui`: `form()` and `field()` patches — use `@domphy/form` (`createForm`) instead
- `@domphy/ui`: `FormState` and `FieldState` classes — use `@domphy/form` instead
- `formGroup()` (layout patch) remains in `@domphy/ui`

### Migration: `form` / `field`
```ts
// before (0.5.x)
import { FormState, FieldState } from "@domphy/ui"
const form = new FormState()

// after (0.6.0+)
import { createForm } from "@domphy/form/domphy"
const form = createForm({ defaultValues: { ... } })
```

---

## [0.5.0] — 2026-03-30

### Added
- `@domphy/app`: stale-while-revalidate data cache for loaders
- `@domphy/app`: parallel routes (`@slot`) and intercepting routes
- `@domphy/app`: streaming SSR via `renderToStream`

---

## [0.4.0] — 2026-03-20

### Added
- `@domphy/query`: Domphy adapter — `createQuery`, `createInfiniteQuery`, `createMutation` at `@domphy/query/domphy`
- `@domphy/table`: Domphy adapter — `createDomphyTable` at `@domphy/table/domphy`
- `@domphy/query`, `@domphy/table`, `@domphy/router`, `@domphy/app`: initial packages

---

## [0.3.0] — 2026-03-10

### Changed
- `@domphy/core` and `@domphy/theme` are now **peer dependencies** of all other packages. Install one copy across the project — no duplicate runtime.

### Migration
Add explicit installs if missing:
```bash
npm install @domphy/core @domphy/theme
```
