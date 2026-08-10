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
- **A string child is TEXT, always.** Markup inside it is escaped, never parsed — on the client and in SSR output. Rendering a string as HTML is an explicit opt-in: `rawHtml("<b>x</b>")` from `@domphy/core`. Wrap only markup you control (a Markdown renderer, a syntax highlighter, a generated SVG); `rawHtml()` still strips `<script>`/`on*`/`javascript:` but is defense in depth, not a sanitizer for untrusted input.
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
- **Layout, not hand-rolled flex styles:** reach for `stack()` (vertical flex column + gap), `row()` (horizontal flex + gap, centered by default, with `align`/`justify`/`wrap`), and `panelSection()` (density-aware padding + optional bottom divider — a thin wrapper, compose it with `stack()`/`row()` for the flex itself) before writing `style: { display: "flex", flexDirection: ..., gap: ... }` inline. `toolbar()` is a semantic alias of `row()` for headers/nav bars.
- **`_key`** on dynamic/reordered child lists (identity for reconcile). It is not DOM id / business identity.
- **CSP nonce:** if the app has a Content-Security-Policy requiring nonces on inline styles, call `configure({ cspNonce: "..." })` from `@domphy/core` before mounting. This stamps the nonce on every Domphy-injected `<style>` element, and on the inline `<style>`/`<script>` tags emitted by `@domphy/app` SSR/streaming.
- **Error boundaries:** use the `errorBoundary()` patch (`@domphy/ui`) to catch errors thrown in reactive children. It invokes `_onError` on the nearest ancestor; call `reset()` to swap in a fallback element.
- **Lifecycle hooks** (`_onSchedule`, `_onInit`, `_onInsert`, `_onMount`, `_onBeforeUpdate`, `_onUpdate`, `_onBeforeRemove(node, done)` — must call `done()`, `_onRemove`, `_onError(node, error, reset)` — error boundary; call `reset()` to clear children and render fallback) for imperative/3rd-party integration; events stay flat (`onClick`, `onInput`).
- **Comments in code: English only.** Names: descriptive, no abbreviations (`index` not `i` except loops; `listener` `l`, event `e`, node `node`).
- **Self-check:** run `@domphy/doctor` `diagnose(element)` (or `validate(element)`) on what you produce and fix every reported issue before finishing. Rules: `inline-typography` (fontSize/lineHeight/fontWeight/letterSpacing/fontFamily/textDecoration literals — use patches), `raw-theme-value` (literal hex/rgb colors AND CSS named colors like "red"/"white" on direct color props — hint gives nearest `themeColor()` via CIELAB/LCH perceptual match), `raw-spacing-value` (literal rem/em/px/logical spacing props — use `themeSpacing(n)`), `low-opacity` (style.opacity < 0.6 on interactive elements — too dim to be discoverable), `tone-background-inherit` (backgroundColor must use themeColor(l, "inherit") — shift the surface via dataTone instead), `missing-color` (element uses themeColor but no style.color — text won't follow tone context shifts; null-content decorative hosts like swatches/glyphs exempt), `low-contrast` (text/bg shift gap < 9 — insufficient contrast), `dataTone-surface-contract` (dataTone set but missing backgroundColor and/or color), `color-shift-minimum` (style.color resolves to tone step < 9 on a dataTone surface), `unknown-tone` (invalid dataTone — valid: inherit/base/shift-N/increase-N/decrease-N, N ≤ 17), `middle-surface-anchor` (dataTone shift-4–13 mid-ramp — use edge anchors 0–3 or 14–17), `unknown-density` (dataDensity invalid or N > 4), `unknown-size` (dataSize invalid or N > 7), `invalid-nesting` (HTML content-model violations the browser re-parents, breaking SSR/hydration: flow content in `<p>`, a/button inside a/button, `li`/`dt`/`dd`/`tr`/`td`/`th`/`option`/`thead`/`tbody`/`tfoot`/`caption`/`colgroup` with the wrong parent, non-`li` element child of `ul`/`ol` — declared direct parent-child only; reactive content and SVG subtrees exempt), `click-without-keyboard` (`onClick` on a non-interactive element — not a/button/input/select/textarea/summary/label, no interactive role, no tabIndex — without a keyboard handler; hidden elements exempt), `missing-required-attribute` (`img` without `alt` — aria-label/labelledby or role presentation/none OK — and `iframe` without `title` are errors; `a` with `onClick` but no `href`/`role` is a warning), `void-content`, `missing-key`, `duplicate-key`, `unstable-key`, `unknown-tag`, `unused-doctor-disable` (info — a `_doctorDisable` entry that suppresses nothing on its element: the named rule fired no diagnostic there, or the id matches no known rule — catches typo'd suppressions like "low-contrst"). `fix(element)` auto-applies the lossless ones. `DiagnoseOptions`: `only` (whitelist rule ids), `exclude` (blacklist rule ids), `rules` (custom rule array). Inline suppression: `_doctorDisable: true | "rule-id" | string[]` on an element silences its diagnostics.

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
| `@domphy/core` | runtime: element/reactivity/lifecycle/SSR/CSS-in-JS (`toState`, `RecordState`, `ElementNode`; derived: `computed`/`effect`/`effectScope`/`batch`/`untrack`; `flushSync()` drains reactivity synchronously for tests/imperative code; `peek(read)` reads a reactive `(listener) => T` outside a render context without subscribing; `behavior(key, attach, props)` — per-node imperative state that survives reactive re-renders, see "Reused-node lifecycle" below; `configure`/`getConfig` — global config incl. `cspNonce`; `sanitizeHTMLString` — the shared string-level sanitizer behind `rawHtml()`/SSR; multi-root `rawHtml` renders all roots client-side (SSR/client parity); computeds auto-unsubscribe upstream when unobserved; DEV-mode hydration mismatch warnings) |
| `@domphy/theme` | design tokens (`themeColor`/`themeSpacing`/`themeSize`/`themeApply`); `resolveThemeColor({ theme, tone, color })` — explicit non-reactive token resolution (the supported form of `themeColorToken(null,…)`); `ToneAliases`/`TONE_STEPS` constants; `generateTheme(baseColors, opts?)` builds a full `ThemeInput` from one base hex per semantic role via the built-in palette engine (see `DESIGN.md`) — base hexes are validated/normalized (`#fff` works, invalid throws); custom themes must have 18-step ramps + 8 fontSizes (validated); palette engine — `Ramp`/`Palette`/`Swatch`: 5 CIELAB quality metrics; `generateRamp(baseColors, steps)`: builds a WCAG-span-optimized 18-step ramp from one or more anchor colors via a warped Oklab interpolation (see `DESIGN.md` §3); `isValidHex`/`normalizeHex` hex validation (#rgb/#rgba/#rrggbb/#rrggbbaa) |
| `@domphy/ui` | 98 patches (`button`, `buttonGhost`, `card`, `dialog`, `select`, `motion`, `formGroup`, `errorBoundary`, `rating`, `fab`, `list`, `timeline`, `scrollArea`, `ringProgress`, `inputPassword`, `stack`, `row`, `grid`, `panelSection`, `visuallyHidden`, …); shared style helpers `focusRing`/`elevation` are public exports; `inputText({ type })` sets the input's `type` (default `"text"`) |
| `@domphy/query` | async state — adapter `createQuery`/`createMutation`/`createInfiniteQuery`/`bindResult` at `@domphy/query/domphy`; `bindResult` connects an observer to Domphy reactivity so result fields are readable with a listener; `dehydrate`/`hydrate` (main entry) serialize/restore query-cache state for SSR |
| `@domphy/table` | headless tables — adapter `createDomphyTable` at `@domphy/table/domphy` |
| `@domphy/router` | type-safe routing — `createRouter`/`createRoute`/`createRootRoute`/`createRootRouteWithContext`; 1-1 port of `@tanstack/router-core` with a deviation list (see `packages/router/UPSTREAM.md`) |
| `@domphy/virtual` | virtualization — adapter `createVirtualizer` at `@domphy/virtual/domphy` |
| `@domphy/form` | forms — adapter `createForm` at `@domphy/form/domphy`; byte-level port pinned to `@tanstack/form-core@1.33.0` (see `packages/form/SOURCES.md`) |
| `@domphy/dnd` | drag & drop — `dragDrop(state, config?)`, `multiList(options)`, `multiListGroup(group, states, config?)` (wraps `@formkit/drag-and-drop`) |
| `@domphy/blocks` | 173 composed blocks/effect components — sidebar layouts, auth pages, a dashboard, `@domphy/chart` recipes (from shadcn/ui), and marketing/effect components (from Magic UI). Every export is a **factory function** `name(props?) => DomphyElement` returning a full mountable tree (not a `$`-patch). Subpaths: `@domphy/blocks/shadcn`, `@domphy/blocks/magicui` (family barrels for smaller bundles). Clean-room reimplemented — see `packages/blocks/SOURCES.md` |
| `@domphy/app` | Next.js App Router-style framework: routes/layouts/loaders(SWR)/metadata/middleware/parallel+intercepting routes/**lazy code-split routes** (`lazy: () => import(...)`)/SSR+streaming/API routes/**i18n routing** (`createI18nMiddleware`+`getLocale`)/**cookies** (`cookies(headers?)`); also `optimizedImage`, `script`, `createMemoryHistory`/`createBrowserHistory`, `buildHref`, `DataCache`; SSR/streaming stamps `configure({cspNonce})` on injected inline `<style>`/`<script>` |
| `@domphy/doctor` | static analyzer — `diagnose(element, opts?)` / `validate(element, opts?)` flag non-idiomatic trees; `format(diagnostics)` formats a `Diagnostic[]`; `fix(element)` applies lossless autofixes. Options: `only`/`exclude` (rule filtering), `rules` (custom rules), `runReactive` (default true). Inline suppression: `_doctorDisable: true | "rule-id" | string[]` on any element. CLI `domphy-doctor <path...>` scans files on disk (flags: `--only`/`--exclude`/`--no-reactive`/`--no-output`/`--format text\|json`; reports per-file import failures and exits 1); `auditOutput(node, opts?)` is an optional Layer 4 that lints the real generated HTML/CSS via `htmlhint`/`stylelint` (optional peer deps). Depends on `@domphy/theme` (single source for tone grammar/aliases). **Run it on your output and fix the report.** |
| `@domphy/floating` | anchor positioning (vendored floating-ui, zero-dep; pinned core@1.7.5/dom@1.7.6 with a deviation list — see `packages/floating/UPSTREAM.md`) — powers `@domphy/ui` overlays, `@domphy/chart` tooltips, and `@domphy/editor` bubble menus; public surface: `computePosition`/`autoUpdate` + middleware (`offset`/`flip`/`shift`/`arrow`/`size`/`inline`/…), `VirtualElement` for anchoring to non-element rects |
| `@domphy/chart` | WebGL + SVG chart engine — `chart(option)` patch renders line/bar/pie/scatter/radar/heatmap/candlestick/etc. series (luma.gl WebGL) with SVG overlays for axes/legend/tooltip/layout series; `ChartEngine` for headless/advanced use; scale creators (`createLinearScale`, `createOrdinalScale`, `createTimeScale`, `createLogScale`), dataset transforms (`applyTransforms`, `resolveDataset`), color utilities (`seriesColor` — theme-aware var-ref default, recommended, `familyCss`, `cssColor`, `createColorResolver`, `hexToRgba`, `seriesHex`/`familyHex` — static light-theme design-time helpers, `seriesPaletteFamily`, `colorFromVisualMap`); theme-aware (colors follow `[data-theme]` at paint time + re-render on flips: SVG layers carry `var(--…)` refs, WebGL uniforms re-resolve); tooltip `formatter` may return a `DomphyElement`, tooltip positioning via `@domphy/floating`; ECharts-compatible type surface |
| `@domphy/three` | declarative three.js scene graph — 1-1 functional port of `@react-three/fiber` core (reconciler, raycast pointer events, demand frameloop) on Domphy reactivity; `three(options)` patch mounts a canvas host and renders the scene graph, `extend(classes)` registers custom/version-agnostic tags for `resolve()`, `loadAsset`/`preloadAsset`/`clearAsset` for reactive asset loading (`AssetResult<T>`: `data`/`error`/`promise`); the `onCreated(root)` object is typed `CreatedRootState` (RootState + `setSize`); `diagnose(options)`/`validate(options)` — scene-level static analyzer (doctor's contract shape for the three() option object doctor cannot see): rules `unknown-tag`, `tag-not-first` (props-first description the reconciler's first-own-key tag read would throw on), `legacy-light-intensity`, `additive-blowout`, `camera-missing-lookat`; per-node suppression via `_doctorDisable` |
| `@domphy/editor` | rich-text editor with a Tiptap-compatible API on a self-contained engine (no ProseMirror) — `Editor`, `Extension.create`/`Node.create`/`Mark.create` (incl. plain-DOM `addNodeView`), chainable commands (`chain()`/`can()`, `isActive`, `getJSON`/`getHTML`/`getText`), `starterKit(options?)` set (paragraph/heading/bold/italic/strike/code/underline/blockquote/lists/hardBreak/horizontalRule/link with autolink/codeBlock/undo-redo/trailingNode; per-extension `false` to disable) + `Table` subset (`insertTable`/`goToNextCell`/row-column ops, not in the kit), input rules (`# `, `**bold**`, `- `…) + keymap, view hooks `onPaste`/`onDrop`/`onKeyDown`, `onUpdate({ editor, transaction })`; positions are ProseMirror-style token positions; `getJSON()` omits default-valued attrs (Tiptap JSON loads unchanged). Domphy adapter at `@domphy/editor/domphy`: `createEditor`, `editorContent()` patch (host element must declare `null` children), `bubbleMenu()` patch (selection-anchored via `@domphy/floating`, shadow-root-safe), `editorState(editor)` reactive readers; `editor.stateVersion` is the reactivity bridge (a `State<number>` bumped per transaction) |
| `@domphy/mcp` | MCP server exposing 10 tools: `domphy_list_patches`, `domphy_get_patch`, `domphy_list_packages`, `domphy_rules`, `domphy_tones`, `domphy_diagnose`, `domphy_validate`, `domphy_fix`, `domphy_list_app_blocks`, `domphy_get_app_block` — patches, packages, rules, tones, doctor, and app-block registry |
| `@domphy/press` | VitePress-baseline static doc site framework — `defineConfig`, `buildSite`, `pressCSS`, CLI `domphy-press build / dev / preview`; built on `@domphy/app`; the Markdown pipeline (formerly `@domphy/markdown` — `parseMarkdown`, `markdownToDomphy`, `createMarkdown`, `walkMdast`, `splitFrontmatter`, `transformOutsideCodeBlocks`, `createUniqueSlugger`/`defaultSlugify`; remark/unified under the hood) ships as named exports of the **main entry only** (not the `/browser` subpath); CSS generated via `pressCSS()` + `themeCSS()` (no static .css file); supports VitePress containers (tip/warning/info/danger/details/code-group), `<<<` code imports, frontmatter hero/features/`fullBleed`, `--dp-font-sans`/`--dp-font-mono`/`--dp-font-display` font hooks, sidebar/nav/TOC, built-in local search (`SearchWidgetOptions.basePath` — base-aware); extras: line highlighting, code-group tabs, 14 admonition types, steps, task lists, mark/sub/sup, emoji, mermaid CDN, social links, edit link, last-updated, reading time, sidebar badges/collapsible, announcement bar, i18n, per-page head, heading anchor links, image lazy loading, `<Badge>` inline component; build fails when any page fails unless `continueOnError: true`; emits 404.html + a content-hashed islands bundle; `withBase(base, href)` base-prefixes emitted hrefs (nav/sidebar/hero links + canonical/sitemap/OG URLs auto-prefixed for non-root deploys); `SiteConfig.cspNonce` stamps a CSP nonce on all inline `<script>`/`<style>` + forwards to `@domphy/app` SSR |
| `@domphy/i18n` | generic i18next wrapper with Domphy reactivity — `createI18n<TLocale, TMessages>(options)` returns `{ t(listener?, key), locale, currentLocale, exists, setLocale, getLocale, detectLocale, initI18n }`; globalThis dedup survives Vite chunk splitting; reactive `t(listener, key)` overload re-renders on `setLocale()` |
| `create-domphy` | scaffolder — `npm create domphy@latest <dir>` writes a runnable Vite + TS starter (themeApply + sample patches + AGENTS.md) |
| `domphy-web` | docs website — built with `@domphy/press` on `@domphy/app`; renders Mermaid diagrams docs-site-internally (client-side via the islands runtime + CDN; the former `@domphy/mermaid` source lives in `apps/web/mermaid/`) (internal, not published to npm) |
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
// API requires a concrete hex/rgb string. For explicit non-reactive resolution
// (no listener at all), use resolveThemeColor({ theme, tone, color }).
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
| Muted / disabled text | `"muted"` | `"shift-8"` | secondary text (de-emphasis only — see note below) |
| Body text | `"text"` | `"shift-9"` | paragraph |

**Contrast contract:** `"text"` (shift-9) sits at the K=9 contrast span and clears WCAG AA 4.5:1 on any edge-anchored surface in every built-in role. `"muted"` (shift-8) is deliberately below that floor (~4.1–4.2:1): it is the de-emphasis tone for supplementary/decorative content (timestamps, captions, placeholders) where the info is non-essential or available elsewhere. Essential text (labels, instructions, error text, button names, nav items) must use `"text"` — axe `color-contrast` will flag a `muted` element carrying essential content, and the fix is to promote it to `"text"`, not to raise the muted tone.
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
- **Elevation**: floating/raised surfaces (popover, menu, dialog, drawer, toast, tooltip, combobox/selectBox dropdown, datePicker popup, fab) use the shared `elevation(level)` helper (public export of `@domphy/ui`) — 3 levels (`"low" | "medium" | "high"`), layered black-alpha box-shadows that read correctly on both themes. Combined with a `border-strong` outline for the "shadow + border" look on panel-style surfaces (popover, menu, combobox/selectBox dropdown, datePicker); shadow-only (no outline) on dialog/drawer/toast/tooltip.
- **Focus ring**: interactive patches (button, buttonGhost, linkButton, link, listItemButton, inputs, select, selectItem, textarea, segmented, tabs, toggleGroup, rating, pagination, menu items, command items, datePicker cells, accordion/details summary, splitter handle, breadcrumbEllipsis, fab) unify on the shared `focusRing(listener, color)` helper (public export of `@domphy/ui`) — ring-offset pattern via layered `box-shadow` on `:focus-visible` (`0 0 0 2px surface, 0 0 0 4px accent@shift-9`), matching Radix/shadcn. Never hand-roll a flush `0 0 0 2px` pastel ring.
- **Press `:active`**: primary CTA controls (button outline/solid, buttonGhost, linkButton, fab, listItemButton) apply the design-system interactive delta — hover `±1`, pressed `±2` (solid uses `decrease-N` on the dark edge surface).

### Doctor rules (complete list — 22 built-in)
`inline-typography`, `raw-theme-value` (hex/rgb + CSS named colors), `raw-spacing-value`, `low-opacity` (style.opacity < 0.6 on interactive controls — too dim to be discoverable; info if hover-restore pattern detected), `tone-background-inherit` (backgroundColor must resolve to themeColor(l, "inherit") — detected by running the reactive fn at context=0: var(--X-N) with N>0 means a fixed shifted tone; shift the surface via dataTone instead), `missing-color` (element uses themeColor for bg/border but has no style.color — text won't re-evaluate on tone shift; null-content decorative hosts exempt), `low-contrast` (text `color` and `backgroundColor` resolve to same-family theme vars — reactive `themeColor()` results or static `var(--X-N)` literals — but their shift numbers differ by < 9 — insufficient contrast), `dataTone-surface-contract` (dataTone set but missing backgroundColor and/or color — a tone context surface must declare both so children can guarantee readable contrast), `color-shift-minimum` (style.color on a dataTone element resolves to tone step < 9 — below the minimum for legible body text), `unknown-tone`, `middle-surface-anchor`, `unknown-density`, `unknown-size`, `invalid-nesting` (error — HTML content-model violations the browser re-parents, breaking SSR/hydration: flow content in `<p>`, interactive-in-interactive a/button, `li`/`dt`/`dd`/`tr`/`td`/`th`/`option`/table-section tags with the wrong parent, non-`li` element child of `ul`/`ol`; declared direct parent-child pairs only — reactive content, rawHtml, and SVG subtrees are exempt), `click-without-keyboard` (warning — `onClick` on a non-interactive element without a keyboard handler, interactive role, or tabIndex; hidden elements exempt), `missing-required-attribute` (`img` without `alt` and `iframe` without `title` are errors; `a` with `onClick` but no `href`/`role` is a warning), `void-content`, `missing-key`, `duplicate-key`, `unstable-key`, `unknown-tag`, `unused-doctor-disable` (info — `_doctorDisable` entries that suppress nothing on the element: stale rule ids, `_doctorDisable: true` with nothing fired, or ids matching no known rule). Extend with project rules via `options.rules: CustomRule[]`. Suppress on an element with `_doctorDisable`.

## Custom spinners

`spinner()` (CSS ring) covers most cases. For more variants use [svg-spinners](https://github.com/n3r4zzurr0/svg-spinners) (MIT, 28+ styles). Domphy has no `innerHTML` — convert SVG to element syntax: replace `<style>` child with CSS-in-JS `@keyframes` on the first animated element, inline `style` per element, `hashString(JSON.stringify(kf))` for a unique animation name, `fill="currentColor"` on root `<svg>` + `style.color: (l) => themeColor(l, "shift-7", "neutral")`. Full example in [spinner docs](/docs/ui/patches/spinner).

## Animation

Use the `motion()` patch (`@domphy/ui`): declarative `initial`/`animate`/`exit` via the Web Animations API, with reactive `animate` (pass a `State`). Reorder/FLIP: `transitionGroup()`. Hover/tap: CSS. No `framer-motion` needed — enter/exit/layout map to Domphy's native lifecycle.

## Conventions

- Build: tsup (packages), custom press build script (docs — `apps/web/build.press.ts`, built on `@domphy/press`). Tests: Vitest (+ jsdom for DOM) — CI runs both `pnpm --filter "@domphy/*" test` and `pnpm --filter "domphy-web" test`.
- Before editing UI code, read the relevant patch doc (`apps/web/docs/ui/patches/*.md`) or use the `domphy` skill — each patch has its own prop contract.
- Keep this file, `apps/web/public/llms.txt`, and `apps/web/scripts/llms-full.mjs` in sync when the public API changes.
