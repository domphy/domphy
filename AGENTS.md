# AGENTS.md — Domphy

Instructions for AI agents writing/editing Domphy code. (Human contributors: same rules apply.) This is the canonical short spec. More machine context: `apps/web/public/llms.txt` (index), `apps/web/public/llms-full.txt` (one-shot dump), `apps/web/public/manifest.json` (structured patch/package index), the `@domphy/mcp` server (tools for MCP agents). For the math behind the theme (why the color ramps and spacing/size formulas are shaped the way they are — the CIELAB/Oklab evaluation + generation framework, the context-aware tone/density/size resolution model), see **`DESIGN.md`**.

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
- **Reactivity:** read with `(listener) => state.get(listener)`; write in events with `state.set(...)`. One-way data flow. Prefer `RecordState` for per-key reactivity. A controlled input (`value: (l) => s.get(l)` + `onInput: (e) => s.set(e.target.value)`) is safe. Types: `ReadableState<T>` (the read-only State contract), `ValueOrState<T>` (accepts a plain value, a `State<T>`, or a `ReadableState<T>`), `Computed<T>` (returned by `computed()`, satisfies `ReadableState<T>` — pass a computed wherever `ValueOrState<T>` is expected). `toState(val)` accepts `T | State<T> | ReadableState<T>`.
- **Never inline typography styles** — `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFamily`, `textDecoration`, `color` in `style:` are ALL forbidden. Quick reference:
  - Small / secondary / caption / label text → `{ small: "...", $: [small()] }`
  - Body text → `{ p: "...", $: [paragraph()] }`
  - Heading → `{ h2: "...", $: [heading()] }`
  - Bold → `{ strong: "...", $: [strong()] }`
  - Error / colored text → `{ small: "...", $: [small({ color: "error" })] }`
  - Literal color → `color: (l) => themeColor(l, "base", "colorName")`
  - `fontFamily` → remove entirely (theme owns the font stack)
- **Theme, not hard-coded values:** `themeColor()`, `themeSpacing()`, `themeSize()`, `themeDensity()`; tones are `inherit`/`base`/`shift-N`/`increase-N`/`decrease-N`, or the semantic aliases `surface`/`hover`/`border`/`border-strong`/`muted`/`text` — prefer aliases over raw `shift-N`.
- **`_key`** on dynamic/reordered child lists (identity for reconcile). It is not DOM id / business identity.
- **CSP nonce:** if the app has a Content-Security-Policy requiring nonces on inline styles, call `configure({ cspNonce: "..." })` from `@domphy/core` before mounting. This stamps the nonce on every Domphy-injected `<style>` element.
- **Error boundaries:** use the `errorBoundary()` patch (`@domphy/ui`) to catch errors thrown in reactive children. It invokes `_onError` on the nearest ancestor; call `reset()` to swap in a fallback element.
- **Lifecycle hooks** (`_onSchedule`, `_onInit`, `_onInsert`, `_onMount`, `_onBeforeUpdate`, `_onUpdate`, `_onBeforeRemove(node, done)` — must call `done()`, `_onRemove`, `_onError(node, error, reset)` — error boundary; call `reset()` to clear children and render fallback) for imperative/3rd-party integration; events stay flat (`onClick`, `onInput`).
- **Comments in code: English only.** Names: descriptive, no abbreviations (`index` not `i` except loops; `listener` `l`, event `e`, node `node`).
- **Self-check:** run `@domphy/doctor` `diagnose(element)` (or `validate(element)`) on what you produce and fix every reported issue before finishing. Rules: `inline-typography` (fontSize/lineHeight/fontWeight/letterSpacing/fontFamily/textDecoration literals — use patches), `raw-theme-value` (literal hex/rgb colors AND CSS named colors like "red"/"white" on direct color props — hint gives nearest `themeColor()` via CIELAB/LCH perceptual match), `raw-spacing-value` (literal rem/em/px/logical spacing props — use `themeSpacing(n)`), `low-opacity` (style.opacity < 0.6 on interactive elements — too dim to be discoverable), `tone-background-inherit` (backgroundColor must use themeColor(l, "inherit") — shift the surface via dataTone instead), `missing-color` (element uses themeColor but no style.color — text won't follow tone context shifts), `low-contrast` (text/bg shift gap < 9 — insufficient contrast), `dataTone-surface-contract` (dataTone set but missing backgroundColor and/or color), `color-shift-minimum` (style.color resolves to tone step < 9 on a dataTone surface), `unknown-tone` (invalid dataTone — valid: inherit/base/shift-N/increase-N/decrease-N, N ≤ 17), `middle-surface-anchor` (dataTone shift-4–13 mid-ramp — use edge anchors 0–3 or 14–17), `unknown-density` (dataDensity invalid or N > 4), `unknown-size` (dataSize invalid or N > 7), `void-content`, `missing-key`, `duplicate-key`, `unstable-key`, `unknown-tag`. `fix(element)` auto-applies the lossless ones. `DiagnoseOptions`: `only` (whitelist rule ids), `exclude` (blacklist rule ids), `rules` (custom rule array). Inline suppression: `_doctorDisable: true | "rule-id" | string[]` on an element silences its diagnostics.

## Reused-node lifecycle — the gotchas behind most real bugs

List reconciliation REUSES DOM nodes (by `_key`, or by position for unkeyed lists) and patches them in place. Nearly every hard framework bug found to date (the 0.18.15–0.18.19 fix series) came from code assuming otherwise. The contract:

- **Lifecycle hooks run ONCE per real DOM node.** `_onInit`/`_onInsert`/`_onMount` do NOT re-run when a reactive parent re-renders and the node is reused — even though your factory/patch function was called again and created a fresh closure. Never capture things in `_onMount` that later interactions depend on; event handlers ARE live-rebound on every patch and receive the current `ElementNode` as their 2nd argument — re-derive from that instead (`onClick: (e, node) => ...`).
- **A fresh closure on a reused node is the default, not the exception.** A patch factory called inside a reactive parent gets a brand-new closure per re-render, all bound to the SAME DOM node. Closure-local state (open flags, cached elements) silently resets/diverges per generation — and it is worse than just "resets": an imperative, node-scoped side effect wired from `_onMount` (a document-level outside-click/Escape listener, a `ResizeObserver`) only EVER gets registered by the first-ever generation, since `_onMount` doesn't re-run. That listener keeps closing over generation 1's state forever, while live-rebound trigger events (`onClick` etc.) move on to whatever generation is actually current — the trigger can open a panel that its own dismiss listener can no longer see.
  - **The prescribed fix: `behavior(key, attach, props)`** (`@domphy/core`, Svelte-action-like). `attach(node, props)` runs ONCE for the real DOM node no matter how many times the factory re-runs; every later re-render's `props` are routed into that SAME instance via `update(props)` instead of creating a disconnected one; `destroy()` fires exactly once on removal (composed onto `BeforeRemove`, same guarantee as other hook composition). Use it any time a patch needs imperative, cross-generation state — document/window listeners, `ResizeObserver`/`IntersectionObserver`, non-Domphy library instances. See [Common Patterns → Per-node behavior](https://domphy.com/docs/core/patterns#per-node-behavior) and `packages/ui/src/utils/floating.ts` (the popover/tooltip/selectBox/combobox/datePicker shared implementation) for the reference migration off the old hand-rolled `WeakMap<Element, ...>` generation-eviction pattern.
  - A `WeakMap<Element, ...>` keyed off the live DOM element is still a valid escape hatch for code that isn't a patch factory (no `attach`/`update`/`destroy` shape available), but prefer `behavior()` wherever the state is scoped to one ElementNode's lifetime.
- **Imperatively-inserted children survive reconciliation.** Children added via `node.children.insert(...)` (a floating panel, an `_onInit`-inserted subtree) are exempt from declared-children reconciliation: a re-render neither prunes nor repositions them, and declared content `null` means "no children declared" — not "remove all children".
- **No resurrection during exit animations.** Re-adding a `_key` while the old node's async `_onBeforeRemove(node, done)` is still awaiting `done()` creates a FRESH node; the exiting one finishes its animation and is disposed. Don't cache references to exiting nodes.
- **`_beforeRemoveFired`, `getRoot()`, `_portal` are internals** — patches composing overlays should go through `@domphy/ui`'s existing utilities rather than reimplementing teardown.

## Package map (current)

| Package | Use |
| --- | --- |
| `@domphy/core` | runtime: element/reactivity/lifecycle/SSR/CSS-in-JS (`toState`, `RecordState`, `ElementNode`; derived: `computed`/`effect`/`effectScope`/`batch`/`untrack`; `flushSync()` drains reactivity synchronously for tests/imperative code; `behavior(key, attach, props)` — per-node imperative state that survives reactive re-renders, see "Reused-node lifecycle" below) |
| `@domphy/theme` | design tokens (`themeColor`/`themeSpacing`/`themeSize`/`themeApply`); `generateTheme(baseColors, opts?)` builds a full `ThemeInput` from one base hex per semantic role via `@domphy/palette`'s ramp generator (see `DESIGN.md`) |
| `@domphy/ui` | 93 patches (`button`, `buttonGhost`, `card`, `dialog`, `select`, `motion`, `formGroup`, `errorBoundary`, `rating`, `fab`, `list`, `timeline`, `scrollArea`, `ringProgress`, `inputPassword`, …) |
| `@domphy/query` | async state — adapter `createQuery`/`createMutation`/`createInfiniteQuery`/`bindResult` at `@domphy/query/domphy`; `bindResult` connects an observer to Domphy reactivity so result fields are readable with a listener |
| `@domphy/table` | headless tables — adapter `createDomphyTable` at `@domphy/table/domphy` |
| `@domphy/router` | type-safe routing — `createRouter`/`createRoute`/`createRootRoute`/`createRootRouteWithContext` |
| `@domphy/virtual` | virtualization — adapter `createVirtualizer` at `@domphy/virtual/domphy` |
| `@domphy/form` | forms — adapter `createForm` at `@domphy/form/domphy` |
| `@domphy/dnd` | drag & drop — `dragDrop(state, config?)`, `multiList(options)`, `multiListGroup(group, states, config?)` (wraps `@formkit/drag-and-drop`) |
| `@domphy/blocks` | 173 composed blocks/effect components — sidebar layouts, auth pages, a dashboard, `@domphy/chart` recipes (from shadcn/ui), and marketing/effect components (from Magic UI). Every export is a **factory function** `name(props?) => DomphyElement` returning a full mountable tree (not a `$`-patch). Clean-room reimplemented — see `packages/blocks/SOURCES.md` |
| `@domphy/app` | Next.js App Router-style framework: routes/layouts/loaders(SWR)/metadata/middleware/parallel+intercepting routes/**lazy code-split routes** (`lazy: () => import(...)`)/SSR+streaming/API routes/**i18n routing** (`createI18nMiddleware`+`getLocale`)/**cookies** (`cookies(headers?)`) |
| `@domphy/doctor` | static analyzer — `diagnose(element, opts?)` / `validate(element, opts?)` flag non-idiomatic trees; `format(diagnostics)` formats a `Diagnostic[]`; `fix(element)` applies lossless autofixes. Options: `only`/`exclude` (rule filtering), `rules` (custom rules), `runReactive` (default true). Inline suppression: `_doctorDisable: true | "rule-id" | string[]` on any element. CLI `domphy-doctor <path...>` scans files on disk (flags: `--only`/`--exclude`/`--no-reactive`/`--no-output`/`--format text\|json`); `auditOutput(node, opts?)` is an optional Layer 4 that lints the real generated HTML/CSS via `htmlhint`/`stylelint` (optional peer deps). **Run it on your output and fix the report.** |
| `@domphy/floating` | anchor positioning (vendored floating-ui, zero-dep) — internal to `@domphy/ui` overlays |
| `@domphy/palette` | color-palette engine — `Ramp`/`Palette`/`Swatch`: 5 CIELAB quality metrics (design-time companion to theme); `generateRamp(baseColors, steps)`: builds a WCAG-span-optimized 18-step ramp from one or more anchor colors via a warped Oklab interpolation (see `DESIGN.md` §3) |
| `@domphy/markdown` | parse Markdown → Domphy element trees for SSR/SSG (`parseMarkdown`, `createMarkdown`, `walkMdast`, `splitFrontmatter`; remark/unified under the hood); powers this docs site |
| `@domphy/mermaid` | render Mermaid diagrams (build-time `renderMermaidInTree` SVG + client `mermaidClient()` patch) |
| `@domphy/chart` | canvas chart engine — `chart(option)` patch renders line/bar/pie/scatter/radar/heatmap/candlestick/etc. series; `ChartEngine` for headless/advanced use; scale creators (`createLinearScale`, `createOrdinalScale`, `createTimeScale`, `createLogScale`), dataset transforms (`applyTransforms`, `resolveDataset`), color utilities (`hexToRgba`, `seriesHex`, `seriesPaletteFamily`, `colorFromVisualMap`); ECharts-compatible type surface |
| `@domphy/three` | declarative three.js scene graph — 1-1 functional port of `@react-three/fiber` core (reconciler, raycast pointer events, demand frameloop) on Domphy reactivity; `three(options)` patch mounts a canvas host and renders the scene graph, `extend(classes)` registers custom/version-agnostic tags for `resolve()`, `loadAsset`/`preloadAsset`/`clearAsset` for reactive asset loading (`AssetResult<T>`: `data`/`error`/`promise`); `diagnose(options)`/`validate(options)` — scene-level static analyzer (doctor's contract shape for the three() option object doctor cannot see): rules `unknown-tag`, `legacy-light-intensity`, `additive-blowout`, `camera-missing-lookat`; per-node suppression via `_doctorDisable` |
| `@domphy/audit` | **In development — not yet published.** Planned: a11y + layout runtime audit for Domphy element trees. Do NOT import or use; the package directory does not exist yet. |
| `@domphy/mcp` | MCP server exposing 10 tools: `domphy_list_patches`, `domphy_get_patch`, `domphy_list_packages`, `domphy_rules`, `domphy_tones`, `domphy_diagnose`, `domphy_validate`, `domphy_fix`, `domphy_list_app_blocks`, `domphy_get_app_block` — patches, packages, rules, tones, doctor, and app-block registry |
| `@domphy/press` | VitePress-baseline static doc site framework — `defineConfig`, `buildSite`, `pressCSS`, CLI `domphy-press build / dev / preview`; built on `@domphy/app` + `@domphy/markdown`; CSS generated via `pressCSS()` + `themeCSS()` (no static .css file); supports VitePress containers (tip/warning/info/danger/details/code-group), `<<<` code imports, frontmatter hero/features, sidebar/nav/TOC, built-in local search; extras: line highlighting, code-group tabs, 14 admonition types, steps, task lists, mark/sub/sup, emoji, mermaid CDN, social links, edit link, last-updated, reading time, sidebar badges/collapsible, announcement bar, i18n, per-page head, heading anchor links, image lazy loading, `<Badge>` inline component |
| `@domphy/i18n` | generic i18next wrapper with Domphy reactivity — `createI18n<TLocale, TMessages>(options)` returns `{ t(listener?, key), locale, currentLocale, exists, setLocale, getLocale, detectLocale, initI18n }`; globalThis dedup survives Vite chunk splitting; reactive `t(listener, key)` overload re-renders on `setLocale()` |
| `create-domphy` | scaffolder — `npm create domphy@latest <dir>` writes a runnable Vite + TS starter (themeApply + sample patches + AGENTS.md) |
| `domphy-web` | docs website — built with `@domphy/press` on `@domphy/app` + `@domphy/markdown` (internal, not published to npm) |
| `bench` | benchmarks (internal, not published) |

`@domphy/query`/`table`/`virtual`/`form` each expose a framework-agnostic API at the main entry and a thin Domphy adapter at the `/domphy` subpath, with `@domphy/core` as a peer dependency. `@domphy/router` is the exception: its Domphy adapter (`createRouter`/`createRoute`/...) ships directly from the main entry, with no `/domphy` subpath and no `@domphy/core` dependency.

## Removed / do NOT use

- `@domphy/ui` `form()` and `field()` patches, and `FormState` / `FieldState` classes — **removed**. Use `@domphy/form` (`createForm`). `formGroup()` (layout) still exists.
- No `@domphy/next` (renamed to `@domphy/app`).

## Design system — strict rules

### Color (`themeColor`, `themeColorToken`)
```ts
themeColor(listener, tone?, color?)
// tone: "inherit" | "base" | "shift-N" | "increase-N" | "decrease-N"  (N ≤ 17)
//       | "surface" | "hover" | "border" | "border-strong" | "muted" | "text"  (semantic aliases, prefer these)
// color: "neutral" | "primary" | "secondary" | "info" | "success" | "warning"
//        | "attention" | "error" | "danger" | "highlight"
// Returns a var(--…) CSS reference — reactive, resolves at paint time.

themeColorToken(listener, tone?, color?)
// Same signature as themeColor but returns the resolved token value (e.g. "#4a7ff4")
// instead of a var(--…) CSS reference. Use at design-time or when a third-party
// API requires a concrete hex/rgb string.
```
Tone semantics (three-layer model):
- **Surface anchor** (`dataTone` on container): sets the floor for all children. Use **edge anchors only**: `shift-0`–`shift-3` (light surface) or `shift-14`–`shift-17` (dark surface). Mid-ramp anchors (`shift-4`–`shift-13`) cause children to clamp and collapse contrast — `middle-surface-anchor` error.
- **Semantic zone** (the element's own tone in `themeColor`): distance from surface encodes meaning: `+0` default/resting, `+3` indicator/active-item, `+6` strong accent.
- **Interactive delta** (hover/press in `:hover`/`:active` CSS or reactive): transient `±1` hover, `±2` pressed.

Common role mappings from an edge surface (`shift-0`). Prefer the alias column when one exists:
| Role | Alias | Tone | Example |
|------|-------|------|---------|
| Background / surface | `"surface"` | `"inherit"` / `"shift-1"` | container bg |
| Hover bg | `"hover"` | `"shift-2"` (or `"increase-1"` for a relative bump) | button:hover |
| Stroke / divider | `"border"` | `"shift-3"` | subtle separator |
| Control outline | `"border-strong"` | `"shift-4"` | button/input/card border |
| Placeholder | — | `"shift-7"` | input placeholder |
| Muted / disabled text | `"muted"` | `"shift-8"` | secondary text |
| Body text | `"text"` | `"shift-9"` | paragraph |
| Heading / strong text | — | `"shift-11"` | h2 |
| Active/pressed bg | — | `"increase-2"` | button:active |

### Spacing (`themeSpacing`, `themeDensity`, `themeFluidSpacing`)
```ts
themeSpacing(n)                        // returns `calc(${n/4}em)`; n = number of U units (U = fontSize/4)
themeDensity(listener)                 // returns density factor: 0.75 | 1 | 1.5 | 2 | 2.5
themeFluidSpacing(min, max, vpMin?, vpMax?)  // returns clamp() that scales between themeSpacing(min) and themeSpacing(max) across viewport width
```
- **Always** call `themeSpacing(themeDensity(l) * n)` for padding/gap on bounded controls (buttons, inputs) — not `themeSpacing(n)` alone.
- Use bare `themeSpacing(n)` for structural spacing (between sections) where density shouldn't multiply.
- Use `themeFluidSpacing(min, max)` for page/section padding that should grow with viewport (structural, never for controls).
- Never hardcode `"6px"` / `"1.5em"` — use `themeSpacing(n)`.
- `dataDensity`: `"inherit"` | `"increase-N"` | `"decrease-N"` where N ≤ 4 (5-step scale: 0.75, 1, 1.5, 2, 2.5).

### Size (`themeSize`)
```ts
themeSize(listener, size?)  // size: "inherit" | "increase-N" | "decrease-N"  (N ≤ 7)
```
- `dataSize`: `"inherit"` | `"increase-N"` | `"decrease-N"` where N ≤ 7 (8-step scale).
- Never hardcode `fontSize: "16px"` — use `fontSize: (l) => themeSize(l, "inherit")`.

### Component geometry formula
For bounded controls (`w=1`, density `d`, line count `n=1`):
```ts
paddingBlock: (l) => themeSpacing(themeDensity(l) * 1),
paddingInline: (l) => themeSpacing(themeDensity(l) * 3),
borderRadius: (l) => themeSpacing(themeDensity(l) * 1.5),
// height = (6 + 2d) * U — at d=1.5 → 9U = 36px (canonical button height)
```
Use `outline` not `border` — a 1px border on both sides adds 2px to height and deviates from the formula.

### Elevation and focus ring
- **Elevation**: floating/raised surfaces (popover, menu, dialog, drawer, toast, tooltip, combobox/selectBox dropdown, datePicker popup, fab) use the shared `elevation(level)` helper (`packages/ui/src/utils/elevation.ts`, internal) — 3 levels (`"low" | "medium" | "high"`), layered black-alpha box-shadows that read correctly on both themes. Combined with a `border-strong` outline for the "shadow + border" look on panel-style surfaces (popover, menu, combobox/selectBox dropdown, datePicker); shadow-only (no outline) on dialog/drawer/toast/tooltip.
- **Focus ring**: interactive patches (button, buttonGhost, linkButton, inputs, select, textarea, segmented, tabs, toggleGroup, rating, pagination) unify on the shared `focusRing(listener, color)` helper (`packages/ui/src/utils/focusRing.ts`, internal) — a 2px accent-tone halo via `box-shadow` on `:focus-visible`, layered on top of (not replacing) the control's own resting outline.

### Doctor rules (complete list — 18 built-in)
`inline-typography`, `raw-theme-value` (hex/rgb + CSS named colors), `raw-spacing-value`, `low-opacity` (style.opacity < 0.6 on interactive controls — too dim to be discoverable; info if hover-restore pattern detected), `tone-background-inherit` (backgroundColor must resolve to themeColor(l, "inherit") — detected by running the reactive fn at context=0: var(--X-N) with N>0 means a fixed shifted tone; shift the surface via dataTone instead), `missing-color` (element uses themeColor for bg/border but has no style.color — text won't re-evaluate on tone shift), `low-contrast` (text `color` and `backgroundColor` are both reactive theme vars but their shift numbers differ by < 9 — insufficient contrast; extracted from the `var(--X-N)` string that `themeColor()` returns), `dataTone-surface-contract` (dataTone set but missing backgroundColor and/or color — a tone context surface must declare both so children can guarantee readable contrast), `color-shift-minimum` (style.color on a dataTone element resolves to tone step < 9 — below the minimum for legible body text), `unknown-tone`, `middle-surface-anchor`, `unknown-density`, `unknown-size`, `void-content`, `missing-key`, `duplicate-key`, `unstable-key`, `unknown-tag`. Extend with project rules via `options.rules: CustomRule[]`. Suppress on an element with `_doctorDisable`.

## Custom spinners

`spinner()` (CSS ring) covers most cases. For more variants use [svg-spinners](https://github.com/n3r4zzurr0/svg-spinners) (MIT, 28+ styles). Domphy has no `innerHTML` — convert SVG to element syntax: replace `<style>` child with CSS-in-JS `@keyframes` on the first animated element, inline `style` per element, `hashString(JSON.stringify(kf))` for a unique animation name, `fill="currentColor"` on root `<svg>` + `style.color: (l) => themeColor(l, "shift-7", "neutral")`. Full example in [spinner docs](/docs/ui/patches/spinner).

## Animation

Use the `motion()` patch (`@domphy/ui`): declarative `initial`/`animate`/`exit` via the Web Animations API, with reactive `animate` (pass a `State`). Reorder/FLIP: `transitionGroup()`. Hover/tap: CSS. No `framer-motion` needed — enter/exit/layout map to Domphy's native lifecycle.

## Conventions

- Build: tsup (packages), custom press build script (docs — `apps/web/build.press.ts`, built on `@domphy/press`). Tests: Vitest (+ jsdom for DOM) — CI runs both `pnpm --filter "@domphy/*" test` and `pnpm --filter "domphy-web" test`.
- Before editing UI code, read the relevant patch doc (`apps/web/docs/ui/patches/*.md`) or use the `domphy` skill — each patch has its own prop contract.
- Keep this file, `apps/web/public/llms.txt`, and `apps/web/scripts/llms-full.mjs` in sync when the public API changes.
